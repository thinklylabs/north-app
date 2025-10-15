import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient as createServerSupabase } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const { accountId, code } = await req.json();

    if (!accountId || !code) {
      return NextResponse.json({ error: "accountId and code are required" }, { status: 400 });
    }

    // Verify user
    const authHeader = req.headers.get("authorization");
    let userId: string | null = null;

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

    const baseUrl = (process.env.UNIPILE_DSN || "").replace(/\/$/, "");
    const apiToken = process.env.UNIPILE_TOKEN;
    if (!baseUrl) {
      return NextResponse.json({ error: "Server misconfigured: UNIPILE_DSN missing" }, { status: 500 });
    }

    // Unipile: solve a code-based checkpoint for the account
    const resp = await fetch(`${baseUrl}/api/v1/accounts/${encodeURIComponent(accountId)}/checkpoint/code`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiToken ? { "X-API-KEY": apiToken as string } : {}),
      },
      body: JSON.stringify({ code }),
    });

    const text = await resp.text();
    let json: any = undefined;
    try { json = text ? JSON.parse(text) : undefined; } catch {}

    if (resp.ok) {
      return NextResponse.json({ success: true, account: json }, { status: 200 });
    }

    return NextResponse.json({ error: json?.error || "Failed to solve checkpoint" }, { status: resp.status || 500 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}


