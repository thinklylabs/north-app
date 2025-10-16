import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient as createServerSupabase } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    // Sanitize environment variables to remove Unicode characters
    const baseUrl = (process.env.UNIPILE_DSN || "").replace(/\/$/, "").replace(/[^\x00-\x7F]/g, "");
    const apiToken = (process.env.UNIPILE_TOKEN || "").replace(/[^\x00-\x7F]/g, "");
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/[^\x00-\x7F]/g, "");

    if (!baseUrl) {
      return NextResponse.json({ error: "UNIPILE_DSN missing" }, { status: 500 });
    }
    if (!apiToken) {
      return NextResponse.json({ error: "UNIPILE_TOKEN missing" }, { status: 500 });
    }
    if (!appUrl) {
      return NextResponse.json({ error: "NEXT_PUBLIC_APP_URL missing" }, { status: 500 });
    }

    const appBase = appUrl.replace(/\/$/, "");
    const successUrl = `${appBase}/unipile/linkedin/callback`;
    const failureUrl = `${appBase}/unipile/linkedin/callback`;

    // Resolve current user id (optional, sent back to notify_url as `name`)
    let name: string | undefined = undefined;
    try {
      const authHeader = req.headers.get("authorization");
      if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.slice("Bearer ".length);
        const supa = createSupabaseClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        const { data: userRes } = await supa.auth.getUser(token);
        name = userRes?.user?.id?.replace(/[^\x00-\x7F]/g, "");
      } else {
        const supabase = await createServerSupabase();
        const { data: cookieUser } = await supabase.auth.getUser();
        name = cookieUser?.user?.id?.replace(/[^\x00-\x7F]/g, "") || undefined;
      }
    } catch { /* ignore */ }

    // Use the correct Unipile hosted auth endpoint from documentation
    const response = await fetch(`${baseUrl}/api/v1/hosted/accounts/link`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": apiToken as string,
        accept: "application/json",
      },
      body: JSON.stringify({
        type: "create",
        providers: ["LINKEDIN"],
        api_url: baseUrl,
        expiresOn: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
        success_redirect_url: successUrl,
        failure_redirect_url: failureUrl,
        notify_url: `${appBase}/api/unipile/notify`,
        ...(name ? { name } : {}),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Unipile hosted-auth error:", {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      return NextResponse.json({ 
        error: `Unipile API error: ${response.status} ${response.statusText}`,
        details: errorText 
      }, { status: 500 });
    }

    const json = await response.json().catch(() => null);
    const url: string | undefined = json?.url || json?.authorize_url || json?.link;
    
    if (!url) {
      console.error("No URL in Unipile response:", json);
      return NextResponse.json({ 
        error: "No hosted auth URL returned from Unipile",
        response: json 
      }, { status: 500 });
    }

    return NextResponse.json({ url }, { status: 200 });
  } catch (e: any) {
    console.error("Hosted-link route exception:", e);
    return NextResponse.json({ error: e?.message || "Internal server error" }, { status: 500 });
  }
}


