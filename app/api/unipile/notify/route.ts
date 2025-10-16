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

export async function POST(req: NextRequest) {
  try {
    const supa = getAdmin();
    const body = await req.json().catch(() => ({}));
    // Expected example payload: { status: "CREATION_SUCCESS", account_id: "...", name: "<auth-user-id>" }
    const status = body?.status as string | undefined;
    const accountId = body?.account_id as string | undefined;
    const userId = (body?.name as string | undefined) || null;

    if (!status || !accountId) {
      return NextResponse.json({ ok: false, reason: "missing fields" }, { status: 400 });
    }

    // Only act on successful creation
    if (status !== "CREATION_SUCCESS") {
      return NextResponse.json({ ok: true, ignored: true });
    }

    // 1) Fetch accounts and find this account
    const accounts = await fetchAccounts();
    const account = Array.isArray(accounts?.items)
      ? accounts.items.find((a: any) => a?.id === accountId)
      : undefined;

    const identifier = account?.connection_params?.im?.id || null; // preferred identifier
    if (!identifier) {
      return NextResponse.json({ ok: false, error: "LinkedIn identifier not found on account" }, { status: 200 });
    }

    // 2) Fetch user profile using identifier + account_id to target the actual owner
    const baseUrl = getBaseUrl();
    const apiKey = getApiKey();
    const resp = await fetch(`${baseUrl}/api/v1/users/${encodeURIComponent(identifier)}?account_id=${encodeURIComponent(accountId)}&linkedin_sections=%2A`, {
      method: "GET",
      headers: {
        "X-API-KEY": apiKey,
        accept: "application/json",
      },
      cache: "no-store",
    });
    const text = await resp.text();
    if (!resp.ok) throw new Error(`Unipile user fetch failed: ${resp.status} ${text}`);
    const profileResp = text ? JSON.parse(text) : null;
    const profile = Array.isArray(profileResp) ? profileResp[0] : profileResp;

    // 3a) Store full JSON blob for future use
    try {
      await supa
        .from("linkedin_profile_json")
        .insert({
          user_id: userId,
          account_id: accountId,
          identifier,
          profile_json: profile,
        } as any);
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

    return NextResponse.json({ ok: true, provider_id: payload.provider_id });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "error" }, { status: 500 });
  }
}

