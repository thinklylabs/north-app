import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient as createServerSupabase } from "@/lib/supabase/server";

function getBaseUrl() {
  return (process.env.UNIPILE_DSN || "").replace(/\/$/, "");
}

function getApiKey() {
  return process.env.UNIPILE_TOKEN!;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const devBypass = searchParams.get("dev") === "1";

    // Resolve authenticated user (align with existing connect route behavior)
    let userId: string | null = null;
    if (!(process.env.NODE_ENV !== "production" && devBypass)) {
      const authHeader = req.headers.get("authorization");
      if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.slice("Bearer ".length);
        const supa = createSupabaseClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        const { data: userRes } = await supa.auth.getUser(token);
        userId = userRes?.user?.id ?? null;
      }
      if (!userId) {
        const supabase = await createServerSupabase();
        const { data: cookieUser } = await supabase.auth.getUser();
        userId = cookieUser?.user?.id ?? null;
      }
      if (!userId) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
      }
    }

    const baseUrl = getBaseUrl();
    const apiKey = getApiKey();
    if (!baseUrl) return NextResponse.json({ error: "UNIPILE_DSN missing" }, { status: 500 });
    if (!apiKey) return NextResponse.json({ error: "UNIPILE_TOKEN missing" }, { status: 500 });

    // Direct identifier mode (preferred): use provided LinkedIn identifier
    const directIdentifier = searchParams.get("identifier");
    const providedAccountId = searchParams.get("account_id");
    if (directIdentifier) {
      const qs = new URLSearchParams();
      if (providedAccountId) qs.set("account_id", providedAccountId);
      qs.set("linkedin_sections", "*");

      const url = `${baseUrl}/api/v1/users/${encodeURIComponent(directIdentifier)}?${qs.toString()}`;
      const resp = await fetch(url, {
        method: "GET",
        headers: { "X-API-KEY": apiKey, accept: "application/json" },
        cache: "no-store",
      });
      const text = await resp.text();
      if (!resp.ok) {
        return NextResponse.json({ error: `Failed to fetch profile: ${resp.status} ${text}` }, { status: 502 });
      }
      let json: any = null;
      try { json = text ? JSON.parse(text) : null; } catch (e: any) {
        return NextResponse.json({ error: `Profile JSON parse error: ${e?.message}` }, { status: 502 });
      }
      const profile = Array.isArray(json) ? json[0] : json;
      return NextResponse.json(profile, { status: 200 });
    }

    // Fallback: resolve identifier from accounts if no identifier was provided
    const accResp = await fetch(`${baseUrl}/api/v1/accounts`, {
      method: "GET",
      headers: { "X-API-KEY": apiKey, accept: "application/json" },
      cache: "no-store",
    });
    const accText = await accResp.text();
    if (!accResp.ok) {
      return NextResponse.json({ error: `Failed to list accounts: ${accResp.status} ${accText}` }, { status: 502 });
    }
    let accountsJson: any = null;
    try { accountsJson = accText ? JSON.parse(accText) : null; } catch (e: any) {
      return NextResponse.json({ error: `Accounts JSON parse error: ${e?.message}` }, { status: 502 });
    }

    const accounts: any[] = Array.isArray(accountsJson?.items) ? accountsJson.items : [];
    const linkedinAccounts = accounts.filter((a) => (a?.provider || a?.type) === "LINKEDIN");

    let accountToUse: any = null;
    if (providedAccountId) {
      accountToUse = linkedinAccounts.find((a) => a?.id === providedAccountId) || null;
      if (!accountToUse) {
        return NextResponse.json({ error: "account_id not found for LINKEDIN" }, { status: 404 });
      }
    } else {
      if (linkedinAccounts.length === 0) {
        return NextResponse.json({ error: "No LINKEDIN account connected" }, { status: 404 });
      }
      if (linkedinAccounts.length > 1) {
        return NextResponse.json({ error: "Multiple LINKEDIN accounts found. Provide ?account_id=... or ?identifier=..." }, { status: 400 });
      }
      accountToUse = linkedinAccounts[0];
    }

    const accountId = accountToUse.id as string;
    const resolvedIdentifier = accountToUse?.connection_params?.im?.id || accountToUse?.connection_params?.im?.publicIdentifier || null;
    if (!resolvedIdentifier) {
      return NextResponse.json({ error: "LinkedIn identifier not found on account" }, { status: 500 });
    }

    const url = `${baseUrl}/api/v1/users/${encodeURIComponent(resolvedIdentifier)}?account_id=${encodeURIComponent(accountId)}&linkedin_sections=%2A`;
    const profResp = await fetch(url, {
      method: "GET",
      headers: { "X-API-KEY": apiKey, accept: "application/json" },
      cache: "no-store",
    });
    const profText = await profResp.text();
    if (!profResp.ok) {
      return NextResponse.json({ error: `Failed to fetch profile: ${profResp.status} ${profText}` }, { status: 502 });
    }

    let profileJson: any = null;
    try { profileJson = profText ? JSON.parse(profText) : null; } catch (e: any) {
      return NextResponse.json({ error: `Profile JSON parse error: ${e?.message}` }, { status: 502 });
    }
    const profile = Array.isArray(profileJson) ? profileJson[0] : profileJson;

    return NextResponse.json(profile, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Internal server error" }, { status: 500 });
  }
}


