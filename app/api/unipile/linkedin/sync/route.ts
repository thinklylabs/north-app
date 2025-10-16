import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";

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

    // Store full JSON blob
    try {
      const supaForBlob = getAdmin();
      await supaForBlob
        .from("linkedin_profile_json")
        .insert({
          user_id: user_id || null,
          account_id: accountIdToUse,
          identifier,
          profile_json: profile,
        } as any);
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

    return NextResponse.json({ ok: true, provider_id: payload.provider_id });
  } catch (e: any) {
    console.error("[linkedin/sync] unhandled error", e);
    return NextResponse.json({ error: e?.message || "error" }, { status: 500 });
  }
}


