import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient as createServerSupabase } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    console.log("🚀 [linkedin/connect] POST request received");

    const { username, password } = await req.json();
    console.log("📝 [linkedin/connect] Request body parsed:", {
      hasUsername: !!username,
      hasPassword: !!password
    });

    if (!username || !password) {
      console.log("❌ [linkedin/connect] Missing credentials");
      return NextResponse.json({ error: "username and password are required" }, { status: 400 });
    }

    // Resolve authenticated user id (prefer bearer like existing pattern)
    const authHeader = req.headers.get("authorization");
    let userId: string | null = null;
    console.log("🔐 [linkedin/connect] Auth header present:", !!authHeader);

    if (authHeader?.startsWith("Bearer ")) {
      console.log("🎫 [linkedin/connect] Using Bearer token authentication");
      const token = authHeader.slice("Bearer ".length);
      const supa = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data: userRes } = await supa.auth.getUser(token);
      userId = userRes?.user?.id ?? null;
      console.log("👤 [linkedin/connect] Bearer auth result:", { userId: userId?.substring(0, 8) + "..." });
    }
    if (!userId) {
      console.log("🍪 [linkedin/connect] Trying cookie authentication");
      const supabase = await createServerSupabase();
      const { data: cookieUser } = await supabase.auth.getUser();
      userId = cookieUser?.user?.id ?? null;
      console.log("👤 [linkedin/connect] Cookie auth result:", { userId: userId?.substring(0, 8) + "..." });
    }
    if (!userId) {
      console.log("❌ [linkedin/connect] No valid authentication found");
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const baseUrl = (process.env.UNIPILE_DSN || "").replace(/\/$/, "");
    const apiToken = process.env.UNIPILE_TOKEN;
    console.log("🔧 [linkedin/connect] Environment check:", {
      hasBaseUrl: !!baseUrl,
      hasApiToken: !!apiToken,
      baseUrl: baseUrl
    });

    if (!baseUrl) {
      console.log("❌ [linkedin/connect] UNIPILE_DSN missing");
      return NextResponse.json({ error: "Server misconfigured: UNIPILE_DSN missing" }, { status: 500 });
    }

    // Unipile: create LINKEDIN account via custom auth
    const unipileUrl = `${baseUrl}/api/v1/accounts`;
    const requestBody = {
      provider: "LINKEDIN",
      username,
      password,
    };

    console.log("📡 [linkedin/connect] Making Unipile request:", {
      url: unipileUrl,
      method: "POST",
      hasApiToken: !!apiToken,
      provider: requestBody.provider
    });

    const resp = await fetch(unipileUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiToken ? { "X-API-KEY": apiToken as string } : {}),
      },
      body: JSON.stringify(requestBody),
    });

    console.log("📨 [linkedin/connect] Unipile response:", {
      status: resp.status,
      statusText: resp.statusText,
      ok: resp.ok
    });

    const text = await resp.text();
    console.log("📄 [linkedin/connect] Unipile response text:", text?.substring(0, 500));

    let json: any = undefined;
    try {
      json = text ? JSON.parse(text) : undefined;
      console.log("📋 [linkedin/connect] Parsed JSON:", json);
    } catch (parseError) {
      console.log("❌ [linkedin/connect] JSON parse error:", parseError);
    }

    if (resp.status >= 200 && resp.status < 300 && resp.status !== 202) {
      console.log("✅ [linkedin/connect] Unipile connection successful, saving to database");
      const supabase = await createServerSupabase();

      // Save to linkedin_users table to match what the post route expects
      const dbPayload = {
        provider: "LINKEDIN",
        account_id: json?.id,
        user_id: userId,
        provider_id: json?.id, // Use account ID as provider ID
        created_at: new Date().toISOString(),
      };

      console.log("💾 [linkedin/connect] Database insert payload:", dbPayload);

      const { error: insertError, data: insertData } = await supabase
        .from("linkedin_users")
        .insert(dbPayload)
        .select();

      if (insertError) {
        console.error("❌ [linkedin/connect] Supabase insert failed:", insertError);
        console.error("❌ [linkedin/connect] Insert error details:", {
          code: insertError.code,
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint
        });
        return NextResponse.json({ error: "Unipile OK but DB insert failed" }, { status: 500 });
      }

      console.log("✅ [linkedin/connect] Successfully saved LinkedIn connection to database:", insertData);
      return NextResponse.json({ success: true, account: json }, { status: 200 });
    }

    if (resp.status === 202) {
      console.log("⏳ [linkedin/connect] Checkpoint required (2FA/verification)");
      return NextResponse.json({ checkpointRequired: true, data: json }, { status: 202 });
    }

    console.log("❌ [linkedin/connect] Unipile connection failed:", {
      status: resp.status,
      error: json?.error,
      fullResponse: json
    });
    return NextResponse.json({ error: json?.error || "Failed to connect LinkedIn" }, { status: resp.status || 500 });
  } catch (err: any) {
    console.error("💥 [linkedin/connect] Unexpected error:", err);
    console.error("💥 [linkedin/connect] Error stack:", err?.stack);
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}


