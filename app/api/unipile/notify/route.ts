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

function getOpenAIKey() {
  return process.env.OPENAI_API_KEY || "";
}

async function fetchAccounts() {
  const baseUrl = getBaseUrl();
  const apiKey = getApiKey();
  const resp = await fetch(`${baseUrl}/api/v1/accounts`, {
    method: "GET",
    headers: {
      "X-API-KEY": apiKey,
      accept: "application/json",
    },
    cache: "no-store",
  });
  const text = await resp.text();
  if (!resp.ok) throw new Error(`Unipile accounts fetch failed: ${resp.status} ${text}`);
  return text ? JSON.parse(text) : null;
}

async function fetchUserProfileByAccountId(accountId: string) {
  const baseUrl = getBaseUrl();
  const apiKey = getApiKey();
  const resp = await fetch(`${baseUrl}/api/v1/users/profile?account_id=${encodeURIComponent(accountId)}`, {
    method: "GET",
    headers: {
      "X-API-KEY": apiKey,
      accept: "application/json",
    },
    cache: "no-store",
  });
  const text = await resp.text();
  if (!resp.ok) throw new Error(`Unipile user profile fetch failed: ${resp.status} ${text}`);
  return text ? JSON.parse(text) : null;
}

export async function GET(req: NextRequest) {
  console.log("🔍 [unipile/notify] GET request - webhook health check");
  return NextResponse.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    message: "Webhook endpoint is reachable"
  });
}

export async function POST(req: NextRequest) {
  try {
    console.log("🚀 [unipile/notify] Webhook received");

    const supa = getAdmin();
    const body = await req.json().catch(() => ({}));

    console.log("📝 [unipile/notify] Webhook payload:", {
      status: body?.status,
      account_id: body?.account_id,
      hasName: !!body?.name,
      provider: body?.provider,
      userId: body?.name?.substring(0, 8) + "..." || "none",
      fullBody: body
    });

    // Expected example payload: { status: "CREATION_SUCCESS", account_id: "...", name: "<auth-user-id>" }
    const status = body?.status as string | undefined;
    const accountId = body?.account_id as string | undefined;
    const userId = (body?.name as string | undefined) || null;

    if (!status || !accountId) {
      console.log("❌ [unipile/notify] Missing required fields:", { status, accountId });
      return NextResponse.json({ ok: false, reason: "missing fields" }, { status: 400 });
    }

    // Only act on successful creation
    if (status !== "CREATION_SUCCESS") {
      console.log("ℹ️ [unipile/notify] Ignoring non-success status:", status);
      return NextResponse.json({ ok: true, ignored: true });
    }

    console.log("✅ [unipile/notify] Processing CREATION_SUCCESS for account:", accountId);

    // 1) Fetch accounts and find this account
    console.log("🔍 [unipile/notify] Fetching accounts from Unipile");
    const accounts = await fetchAccounts();
    console.log("📋 [unipile/notify] Accounts fetched:", {
      hasAccounts: !!accounts,
      itemsCount: accounts?.items?.length || 0
    });
    const account = Array.isArray(accounts?.items)
      ? accounts.items.find((a: any) => a?.id === accountId)
      : undefined;

    const identifier = account?.connection_params?.im?.id || null; // preferred identifier
    if (!identifier) {
      return NextResponse.json({ ok: false, error: "LinkedIn identifier not found on account" }, { status: 200 });
    }
    console.log("[unipile/notify] resolved identifier", { identifier });

    // 2) Fetch user profile using identifier + account_id to target the actual owner
    const baseUrl = getBaseUrl();
    const apiKey = getApiKey();
    console.log("[unipile/notify] fetching profile", { url: `${baseUrl}/api/v1/users/${encodeURIComponent(identifier)}?account_id=${encodeURIComponent(accountId)}&linkedin_sections=%2A` });
    const resp = await fetch(`${baseUrl}/api/v1/users/${encodeURIComponent(identifier)}?account_id=${encodeURIComponent(accountId)}&linkedin_sections=%2A`, {
      method: "GET",
      headers: {
        "X-API-KEY": apiKey,
        accept: "application/json",
      },
      cache: "no-store",
    });
    const text = await resp.text();
    console.log("[unipile/notify] profile response", { status: resp.status, statusText: resp.statusText, bodySample: text?.slice(0, 300) });
    if (!resp.ok) throw new Error(`Unipile user fetch failed: ${resp.status} ${text}`);
    const profileResp = text ? JSON.parse(text) : null;
    const profile = Array.isArray(profileResp) ? profileResp[0] : profileResp;

    // 3a) Store full JSON blob for future use and process to document_sections
    try {
      const { data: inserted, error: insertErr } = await supa
        .from("linkedin_profile_json")
        .insert({
          user_id: userId,
          account_id: accountId,
          identifier,
          profile_json: profile,
        } as any)
        .select('id')
        .single()

      if (!insertErr && inserted && typeof inserted.id === 'number') {
        try {
          await processLinkedInProfile(inserted.id)
        } catch (procErr: any) {
          console.warn("[unipile/notify] profile processing error", procErr?.message)
        }
      }
    } catch (e: any) {
      // do not fail webhook on insert error
    }

    // 3b) Map to linkedin_users schema and upsert
    const primaryLocale = profile?.primary_locale || {};
    const websites = Array.isArray(profile?.websites) ? profile.websites : [];
    const contactEmails = Array.isArray(profile?.contact_info?.emails) ? profile.contact_info.emails : [];
    const hashtags = Array.isArray(profile?.hashtags) ? profile.hashtags : [];

    const payload = {
      user_id: userId,
      object: profile?.object || "UserProfile",
      provider: profile?.provider || "LINKEDIN",
      provider_id: profile?.provider_id || identifier,
      account_id: accountId,
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

    const { error } = await supa
      .from("linkedin_users")
      .upsert(payload as any, { onConflict: "provider_id" });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    // 4) After successful profile upsert, attempt to fetch recent posts and generate writing style
    try {
      const baseUrl2 = getBaseUrl();
      const apiKey2 = getApiKey();
      const openaiKey = getOpenAIKey();

      if (!openaiKey) {
        // Skip silently if OpenAI is not configured
        console.warn("[unipile/notify] OPENAI_API_KEY missing; skipping writing style generation");
        return NextResponse.json({ ok: true, provider_id: payload.provider_id, skipped: "OPENAI_API_KEY missing" });
      }

      // Fetch posts for this user (limit to recent 10 via slicing)
      const postsUrl = `${baseUrl2}/api/v1/users/${encodeURIComponent(identifier)}/posts?account_id=${encodeURIComponent(accountId)}`;
      console.log("[unipile/notify] fetching posts", { postsUrl });
      const postsResp = await fetch(postsUrl, {
        method: "GET",
        headers: { "X-API-KEY": apiKey2, accept: "application/json" },
        cache: "no-store",
      });
      const postsText = await postsResp.text();
      console.log("[unipile/notify] posts response", { status: postsResp.status, statusText: postsResp.statusText, bodySample: postsText?.slice(0, 400) });
      if (!postsResp.ok) {
        // Do not fail the webhook on posts failure
        return NextResponse.json({ ok: true, provider_id: payload.provider_id, posts_error: `${postsResp.status} ${postsText}` });
      }
      let postsJson: any = null;
      try { postsJson = postsText ? JSON.parse(postsText) : null; } catch (e: any) {
        console.error("[unipile/notify] posts JSON parse error", e?.message);
        return NextResponse.json({ ok: true, provider_id: payload.provider_id, posts_parse_error: e?.message });
      }

      const items: any[] = Array.isArray(postsJson)
        ? postsJson
        : Array.isArray(postsJson?.items)
          ? postsJson.items
          : [];
      const recent10 = items.slice(0, 10);
      console.log("[unipile/notify] posts parsed", { totalItems: items.length, recent10: recent10.length });

      const postsForLLM = recent10.map((p) => ({
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

      console.log("[unipile/notify] calling OpenAI", { numPosts: postsForLLM.length });
      const style = await generateWritingStyle(postsForLLM, openaiKey);
      console.log("[unipile/notify] OpenAI style generated", { hasStyle: !!style, keys: style ? Object.keys(style) : [] });

      if (style) {
        // Update only the writing_style to avoid overwriting other fields set above
        const { error: updateErr } = await supa
          .from("linkedin_users")
          .update({ writing_style: style })
          .eq("provider_id", identifier)
          .eq("account_id", accountId);

        if (updateErr) {
          console.error("[unipile/notify] writing_style update error", updateErr.message);
          return NextResponse.json({ ok: true, provider_id: payload.provider_id, writing_style_update_error: updateErr.message });
        }
        console.log("[unipile/notify] writing_style saved", { provider_id: identifier, account_id: accountId });
        return NextResponse.json({ ok: true, provider_id: payload.provider_id, writing_style_saved: true });
      }

      return NextResponse.json({ ok: true, provider_id: payload.provider_id, writing_style_saved: false });
    } catch (e: any) {
      // Do not fail the webhook overall if style generation fails
      console.error("[unipile/notify] writing style generation error", e?.message);
      return NextResponse.json({ ok: true, provider_id: payload.provider_id, writing_style_error: e?.message || "error" });
    }
  } catch (e: any) {
    console.error("[unipile/notify] unhandled error", e?.message);
    return NextResponse.json({ ok: false, error: e?.message || "error" }, { status: 500 });
  }
}

async function generateWritingStyle(posts: any[], openaiKey: string) {
  const contentSample = posts.map((p, i: number) => ({
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
    console.error("[unipile/notify] OpenAI error", { status: res.status, errSample: errText?.slice(0, 400) });
    throw new Error(`OpenAI error ${res.status}: ${errText}`);
  }
  const json = await res.json();
  const content: string | undefined = json?.choices?.[0]?.message?.content;
  console.log("[unipile/notify] OpenAI response received", { hasContent: !!content, contentSample: content ? content.slice(0, 200) : null });
  if (!content) return null;

  try {
    return JSON.parse(content);
  } catch {
    return { style_summary: content } as any;
  }
}

