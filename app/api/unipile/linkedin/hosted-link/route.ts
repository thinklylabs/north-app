import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient as createServerSupabase } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    console.log("🚀 [linkedin/hosted-link] POST request received");
    
    const baseUrl = (process.env.UNIPILE_DSN || "").replace(/\/$/, "");
    const apiToken = process.env.UNIPILE_TOKEN;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;

    console.log("🔧 [linkedin/hosted-link] Environment check:", {
      hasBaseUrl: !!baseUrl,
      hasApiToken: !!apiToken,
      hasAppUrl: !!appUrl,
      baseUrl,
      appUrl
    });

    if (!baseUrl) {
      console.log("❌ [linkedin/hosted-link] UNIPILE_DSN missing");
      return NextResponse.json({ error: "UNIPILE_DSN missing" }, { status: 500 });
    }
    if (!apiToken) {
      console.log("❌ [linkedin/hosted-link] UNIPILE_TOKEN missing");
      return NextResponse.json({ error: "UNIPILE_TOKEN missing" }, { status: 500 });
    }
    if (!appUrl) {
      console.log("❌ [linkedin/hosted-link] NEXT_PUBLIC_APP_URL missing");
      return NextResponse.json({ error: "NEXT_PUBLIC_APP_URL missing" }, { status: 500 });
    }

    const appBase = appUrl.replace(/\/$/, "");
    const successUrl = `${appBase}/unipile/linkedin/callback`;
    const failureUrl = `${appBase}/unipile/linkedin/callback`;

    // Resolve current user id (optional, sent back to notify_url as `name`)
    let name: string | undefined = undefined;
    console.log("🔐 [linkedin/hosted-link] Resolving user authentication");
    
    try {
      const authHeader = req.headers.get("authorization");
      console.log("🎫 [linkedin/hosted-link] Auth header present:", !!authHeader);
      
      if (authHeader?.startsWith("Bearer ")) {
        console.log("🎫 [linkedin/hosted-link] Using Bearer token authentication");
        const token = authHeader.slice("Bearer ".length);
        const supa = createSupabaseClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        const { data: userRes } = await supa.auth.getUser(token);
        name = userRes?.user?.id;
        console.log("👤 [linkedin/hosted-link] Bearer auth result:", { userId: name?.substring(0, 8) + "..." });
      } else {
        console.log("🍪 [linkedin/hosted-link] Using cookie authentication");
        const supabase = await createServerSupabase();
        const { data: cookieUser } = await supabase.auth.getUser();
        name = cookieUser?.user?.id || undefined;
        console.log("👤 [linkedin/hosted-link] Cookie auth result:", { userId: name?.substring(0, 8) + "..." });
      }
    } catch (authError) {
      console.log("❌ [linkedin/hosted-link] Auth error:", authError);
    }

    // Use the correct Unipile hosted auth endpoint from documentation
    const requestPayload = {
      type: "create",
      providers: ["LINKEDIN"],
      api_url: baseUrl,
      expiresOn: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
      success_redirect_url: successUrl,
      failure_redirect_url: failureUrl,
      notify_url: `${appBase}/api/unipile/notify`,
      ...(name ? { name } : {}),
    };
    
    console.log("📡 [linkedin/hosted-link] Making Unipile hosted auth request:", {
      url: `${baseUrl}/api/v1/hosted/accounts/link`,
      payload: requestPayload
    });

    const response = await fetch(`${baseUrl}/api/v1/hosted/accounts/link`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": apiToken as string,
        accept: "application/json",
      },
      body: JSON.stringify(requestPayload),
    });

    console.log("📨 [linkedin/hosted-link] Unipile response:", {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ [linkedin/hosted-link] Unipile hosted-auth error:", {
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
    console.log("📋 [linkedin/hosted-link] Unipile response JSON:", json);
    
    const url: string | undefined = json?.url || json?.authorize_url || json?.link;
    console.log("🔗 [linkedin/hosted-link] Extracted URL:", url);
    
    if (!url) {
      console.error("❌ [linkedin/hosted-link] No URL in Unipile response:", json);
      return NextResponse.json({ 
        error: "No hosted auth URL returned from Unipile",
        response: json 
      }, { status: 500 });
    }

    console.log("✅ [linkedin/hosted-link] Successfully generated hosted auth URL");
    return NextResponse.json({ url }, { status: 200 });
  } catch (e: any) {
    console.error("💥 [linkedin/hosted-link] Unexpected error:", e);
    console.error("💥 [linkedin/hosted-link] Error stack:", e?.stack);
    return NextResponse.json({ error: e?.message || "Internal server error" }, { status: 500 });
  }
}


