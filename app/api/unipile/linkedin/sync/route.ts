import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { processLinkedInProfile } from "@/lib/processLinkedInProfile";

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createSupabaseAdmin(url, key);
}

function getBaseUrl() {
  return (process.env.UNIPILE_DSN || "").replace(/\/$/, "");
}

function getApiKey() {
  return process.env.UNIPILE_TOKEN!;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const account_id = body?.account_id as string | undefined;
    const user_id = body?.user_id as string | undefined;

    const baseUrl = getBaseUrl();
    const apiKey = getApiKey();
    console.log("[linkedin/sync] incoming", { account_id, user_id, baseUrlPresent: !!baseUrl, apiKeyPresent: !!apiKey });
    if (!baseUrl) return NextResponse.json({ error: "UNIPILE_DSN missing" }, { status: 500 });
    if (!apiKey) return NextResponse.json({ error: "UNIPILE_TOKEN missing" }, { status: 500 });

    // Require explicit account_id from caller (prevents cross-user data)
    const accountIdToUse = account_id || null;
    if (!accountIdToUse) return NextResponse.json({ error: "account_id is required" }, { status: 400 });

    // Find identifier for the selected account
    console.log("[linkedin/sync] fetching accounts to resolve identifier", { url: `${baseUrl}/api/v1/accounts`, accountIdToUse });
    const accResp2 = await fetch(`${baseUrl}/api/v1/accounts`, {
      method: "GET",
      headers: { "X-API-KEY": apiKey, accept: "application/json" },
      cache: "no-store",
    });
    const accText2 = await accResp2.text();
    console.log("[linkedin/sync] accounts response (resolve)", { status: accResp2.status, statusText: accResp2.statusText, body: accText2?.slice(0, 500) });
    if (!accResp2.ok) return NextResponse.json({ error: `Failed accounts: ${accResp2.status} ${accText2}` }, { status: 502 });
    let accJson2: any = null;
    try { accJson2 = accText2 ? JSON.parse(accText2) : null; } catch (e: any) {
      console.error("[linkedin/sync] accounts JSON parse error (resolve)", e?.message);
      return NextResponse.json({ error: `Accounts JSON parse error: ${e?.message}` }, { status: 502 });
    }
    const account = Array.isArray(accJson2?.items) ? accJson2.items.find((a: any) => a?.id === accountIdToUse) : null;
    const identifier = account?.connection_params?.im?.id || null;
    if (!identifier) return NextResponse.json({ error: "identifier not found" }, { status: 404 });

    // Fetch the authenticated user's own profile by identifier + account_id
    console.log("[linkedin/sync] fetching profile by identifier + account_id", { url: `${baseUrl}/api/v1/users/${encodeURIComponent(identifier)}?account_id=${encodeURIComponent(accountIdToUse)}&linkedin_sections=%2A`, identifier, accountIdToUse });
    const profResp = await fetch(`${baseUrl}/api/v1/users/${encodeURIComponent(identifier)}?account_id=${encodeURIComponent(accountIdToUse)}&linkedin_sections=%2A`, {
      method: "GET",
      headers: { "X-API-KEY": apiKey, accept: "application/json" },
      cache: "no-store",
    });
    const profText = await profResp.text();
    console.log("[linkedin/sync] profile response (by identifier+account_id)", { status: profResp.status, statusText: profResp.statusText, body: profText?.slice(0, 500) });
    if (!profResp.ok) return NextResponse.json({ error: `Failed profile: ${profResp.status} ${profText}` }, { status: 502 });
    let profJson: any = null;
    try { profJson = profText ? JSON.parse(profText) : null; } catch (e: any) {
      console.error("[linkedin/sync] profile JSON parse error", e?.message);
      return NextResponse.json({ error: `Profile JSON parse error: ${e?.message}` }, { status: 502 });
    }
    const profile = Array.isArray(profJson) ? profJson[0] : profJson;

    // Store full JSON blob and process to document_sections
    try {
      const supaForBlob = getAdmin();
      const { data: inserted, error: insertErr } = await supaForBlob
        .from("linkedin_profile_json")
        .insert({
          user_id: user_id || null,
          account_id: accountIdToUse,
          identifier,
          profile_json: profile,
        } as any)
        .select('id')
        .single()

      if (!insertErr && inserted?.id) {
        try {
          await processLinkedInProfile(inserted.id)
        } catch (procErr: any) {
          console.warn("[linkedin/sync] profile processing error", procErr?.message)
        }
      }
    } catch (e: any) {
      // ignore blob insert failure
    }

    // Upsert into linkedin_users
    const supa = getAdmin();
    const primaryLocale = profile?.primary_locale || {};
    const websites = Array.isArray(profile?.websites) ? profile.websites : [];
    const contactEmails = Array.isArray(profile?.contact_info?.emails) ? profile.contact_info.emails : [];
    const hashtags = Array.isArray(profile?.hashtags) ? profile.hashtags : [];

    const payload = {
      user_id: user_id || null,
      object: profile?.object || "UserProfile",
      provider: profile?.provider || "LINKEDIN",
      provider_id: profile?.provider_id || identifier,
      account_id: accountIdToUse,
      public_identifier: profile?.public_identifier || null,
      member_urn: profile?.member_urn || null,
      first_name: profile?.first_name || null,
      last_name: profile?.last_name || null,
      headline: profile?.headline || null,
      country: primaryLocale?.country || null,
      language: primaryLocale?.language || null,
      is_open_profile: !!profile?.is_open_profile,
      is_premium: !!profile?.is_premium,
      is_influencer: !!profile?.is_influencer,
      is_creator: !!profile?.is_creator,
      is_relationship: !!profile?.is_relationship,
      is_self: !!profile?.is_self,
      websites,
      follower_count: typeof profile?.follower_count === "number" ? profile.follower_count : null,
      connections_count: typeof profile?.connections_count === "number" ? profile.connections_count : null,
      location: profile?.location || null,
      contact_emails: contactEmails,
      profile_picture_url: profile?.profile_picture_url || null,
      profile_picture_url_large: profile?.profile_picture_url_large || null,
      background_picture_url: profile?.background_picture_url || null,
      creator_website_url: profile?.creator_website?.url || null,
      creator_website_description: profile?.creator_website?.description || null,
      hashtags,
      created_at: new Date().toISOString(),
    } as const;

    const { error } = await supa.from("linkedin_users").upsert(payload as any, { onConflict: "provider_id" });
    if (error) {
      console.error("[linkedin/sync] supabase upsert error", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // After successful profile upsert, attempt writing_style generation to ensure it runs during sync too
    try {
      const openaiKey = process.env.OPENAI_API_KEY || "";
      if (!openaiKey) {
        console.warn("[linkedin/sync] OPENAI_API_KEY missing; skipping writing style generation");
        return NextResponse.json({ ok: true, provider_id: payload.provider_id, skipped: "OPENAI_API_KEY missing" });
      }

      const postsUrl = `${baseUrl}/api/v1/users/${encodeURIComponent(identifier)}\
/posts?account_id=${encodeURIComponent(accountIdToUse)}`;
      console.log("[linkedin/sync] fetching posts", { postsUrl });
      const postsResp = await fetch(postsUrl, {
        method: "GET",
        headers: { "X-API-KEY": apiKey, accept: "application/json" },
        cache: "no-store",
      });
      const postsText = await postsResp.text();
      console.log("[linkedin/sync] posts response", { status: postsResp.status, statusText: postsResp.statusText, bodySample: postsText?.slice(0, 400) });
      if (!postsResp.ok) {
        return NextResponse.json({ ok: true, provider_id: payload.provider_id, posts_error: `${postsResp.status} ${postsText}` });
      }
      let postsJson: any = null;
      try { postsJson = postsText ? JSON.parse(postsText) : null; } catch (e: any) {
        console.error("[linkedin/sync] posts JSON parse error", e?.message);
        return NextResponse.json({ ok: true, provider_id: payload.provider_id, posts_parse_error: e?.message });
      }

      const items: any[] = Array.isArray(postsJson)
        ? postsJson
        : Array.isArray(postsJson?.items)
          ? postsJson.items
          : [];
      const recent10 = items.slice(0, 10);
      console.log("[linkedin/sync] posts parsed", { totalItems: items.length, recent10: recent10.length });

      const postsForLLM = recent10.map((p: any) => ({
        id: String(p?.id ?? p?.social_id ?? ""),
        date: p?.parsed_datetime || p?.date || null,
        text: String(p?.text || ""),
        reaction_counter: typeof p?.reaction_counter === "number" ? p.reaction_counter : null,
        comment_counter: typeof p?.comment_counter === "number" ? p.comment_counter : null,
        repost_counter: typeof p?.repost_counter === "number" ? p.repost_counter : null,
        impressions_counter: typeof p?.impressions_counter === "number" ? p.impressions_counter : null,
        is_repost: !!p?.is_repost,
        mentions_count: Array.isArray(p?.mentions) ? p.mentions.length : 0,
        attachments_count: Array.isArray(p?.attachments) ? p.attachments.length : 0,
        share_url: p?.share_url || null,
      }));

      const style = await generateWritingStyleSync(postsForLLM, openaiKey);
      console.log("[linkedin/sync] OpenAI style generated", { hasStyle: !!style, keys: style ? Object.keys(style) : [] });

      if (style) {
        const { error: updateErr } = await supa
          .from("linkedin_users")
          .update({ writing_style: style })
          .eq("provider_id", identifier)
          .eq("account_id", accountIdToUse);
        if (updateErr) {
          console.error("[linkedin/sync] writing_style update error", updateErr.message);
          return NextResponse.json({ ok: true, provider_id: payload.provider_id, writing_style_update_error: updateErr.message });
        }
        console.log("[linkedin/sync] writing_style saved", { provider_id: identifier, account_id: accountIdToUse });
        return NextResponse.json({ ok: true, provider_id: payload.provider_id, writing_style_saved: true });
      }

      return NextResponse.json({ ok: true, provider_id: payload.provider_id, writing_style_saved: false });
    } catch (e: any) {
      console.error("[linkedin/sync] writing style generation error", e?.message);
      return NextResponse.json({ ok: true, provider_id: payload.provider_id, writing_style_error: e?.message || "error" });
    }
  } catch (e: any) {
    console.error("[linkedin/sync] unhandled error", e);
    return NextResponse.json({ error: e?.message || "error" }, { status: 500 });
  }
}



async function generateWritingStyleSync(posts: any[], openaiKey: string) {
  const contentSample = posts.map((p: any, i: number) => ({
    i,
    date: p.date,
    text: p.text?.slice(0, 3000) || "",
    reactions: p.reaction_counter,
    comments: p.comment_counter,
    reposts: p.repost_counter,
    impressions: p.impressions_counter,
    is_repost: p.is_repost,
    mentions_count: p.mentions_count,
    attachments_count: p.attachments_count,
  }));

  const system = [
    "You are an expert social writing-style analyst.",
    "Given up to 10 LinkedIn posts, infer the author's writing style in a concise, re-usable, structured JSON profile.",
    "Focus on tone, formality, typical length, vocabulary, sentence structure, punctuation/emoji use, hashtag usage, calls-to-action, recurring topics/themes, and 8-12 style rules the author tends to follow.",
    "Keep the profile actionable and not tied to specific post content; do not include personally identifiable information.",
  ].join(" ");

  const user = JSON.stringify({
    instructions: "Infer the author's writing style from these posts.",
    posts: contentSample,
    output_schema: {
      style_summary: "string",
      tone: "string",
      formality: "string",
      typical_length: "string",
      vocabulary: "string",
      sentence_structure: "string",
      punctuation_emojis: "string",
      hashtags_usage: "string",
      calls_to_action: "string",
      recurring_topics: ["string"],
      style_rules: ["string"],
    },
  });

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    console.error("[linkedin/sync] OpenAI error", { status: res.status, errSample: errText?.slice(0, 400) });
    throw new Error(`OpenAI error ${res.status}: ${errText}`);
  }
  const json = await res.json();
  const content: string | undefined = json?.choices?.[0]?.message?.content;
  console.log("[linkedin/sync] OpenAI response received", { hasContent: !!content, contentSample: content ? content.slice(0, 200) : null });
  if (!content) return null;

  try {
    return JSON.parse(content);
  } catch {
    return { style_summary: content } as any;
  }
}
