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

    // Auth (dev bypass for localhost)
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

    const resp = await fetch(`${baseUrl}/api/v1/accounts`, {
      method: "GET",
      headers: { "X-API-KEY": apiKey, accept: "application/json" },
      cache: "no-store",
    });
    const text = await resp.text();
    if (!resp.ok) {
      return NextResponse.json({ error: `Failed to list accounts: ${resp.status} ${text}` }, { status: 502 });
    }
    let json: any = null;
    try { json = text ? JSON.parse(text) : null; } catch (e: any) {
      return NextResponse.json({ error: `Accounts JSON parse error: ${e?.message}` }, { status: 502 });
    }
    const items = Array.isArray(json?.items) ? json.items : [];
    const linkedinItems = items.filter((a: any) => a?.provider === "LINKEDIN");

    return NextResponse.json({ items: linkedinItems.map((a: any) => ({ id: a.id, provider: a.provider, label: a.label, status: a.status })) }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Internal server error" }, { status: 500 });
  }
}


