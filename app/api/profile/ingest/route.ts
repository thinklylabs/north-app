import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { extractWebsiteContentWithFallback } from "@/lib/tavily";

export async function POST(req: NextRequest) {
  try {
    const { websiteUrl, companyName } = await req.json();

    if (!websiteUrl || typeof websiteUrl !== "string") {
      return NextResponse.json({ error: "websiteUrl is required" }, { status: 400 });
    }
    if (!companyName || typeof companyName !== "string") {
      return NextResponse.json({ error: "companyName is required" }, { status: 400 });
    }

    let normalizedUrl: string;
    try {
      const u = new URL(websiteUrl);
      normalizedUrl = u.toString();
    } catch {
      return NextResponse.json({ error: "websiteUrl must be a valid absolute URL" }, { status: 400 });
    }

    // Try bearer token first (robust across environments), fall back to cookie session
    const authHeader = req.headers.get("authorization");
    let userId: string | null = null;

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice("Bearer ".length);
      const supa = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data: userRes, error: tokenErr } = await supa.auth.getUser(token);
      if (!tokenErr && userRes?.user) {
        userId = userRes.user.id;
      }
    }

    if (!userId) {
      const supabase = await createServerSupabase();
      const { data: cookieUser, error: cookieErr } = await supabase.auth.getUser();
      if (!cookieErr && cookieUser?.user) {
        userId = cookieUser.user.id;
      }
    }

    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Extract content via Tavily
    const { content } = await extractWebsiteContentWithFallback(normalizedUrl);

    // Update profile row (RLS: id = auth.uid())
    // Upsert to ensure row exists, respecting RLS (id must equal auth.uid())
    const supabase = await createServerSupabase();
    const { error: updateErr } = await supabase
      .from("profiles")
      .upsert(
        {
          id: userId,
          website_url: normalizedUrl,
          company_name: companyName,
          website_content: content || null,
        },
        { onConflict: "id" }
      );

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


