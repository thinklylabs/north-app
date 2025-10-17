import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    let userId: string | null = null;

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice("Bearer ".length);
      const supa = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data: userRes } = await supa.auth.getUser(token);
      if (userRes?.user) userId = userRes.user.id;
    }

    if (!userId) {
      const supabase = await createServerSupabase();
      const { data: cookieUser } = await supabase.auth.getUser();
      if (cookieUser?.user) userId = cookieUser.user.id;
    }

    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const supabase = await createServerSupabase();
    const { data, error } = await supabase
      .from("profiles")
      .select("icp, icp_pain_points, onboarding_summary")
      .eq("id", userId)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, profile: data ?? null });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const icp = typeof body.icp === "string" ? body.icp : undefined;
    const icp_pain_points = typeof body.icp_pain_points === "string" ? body.icp_pain_points : undefined;
    const onboarding_summary = typeof body.onboarding_summary === "string" ? body.onboarding_summary : undefined;

    if (
      (icp === undefined || icp === null) &&
      (icp_pain_points === undefined || icp_pain_points === null) &&
      (onboarding_summary === undefined || onboarding_summary === null)
    ) {
      return NextResponse.json({ error: "At least one field is required" }, { status: 400 });
    }

    const authHeader = req.headers.get("authorization");
    let userId: string | null = null;

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice("Bearer ".length);
      const supa = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data: userRes } = await supa.auth.getUser(token);
      if (userRes?.user) userId = userRes.user.id;
    }

    if (!userId) {
      const supabase = await createServerSupabase();
      const { data: cookieUser } = await supabase.auth.getUser();
      if (cookieUser?.user) userId = cookieUser.user.id;
    }

    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const supabase = await createServerSupabase();

    const payload: Record<string, any> = { id: userId };
    if (icp !== undefined) payload.icp = icp;
    if (icp_pain_points !== undefined) payload.icp_pain_points = icp_pain_points;
    if (onboarding_summary !== undefined) payload.onboarding_summary = onboarding_summary;

    const { error: upsertErr } = await supabase
      .from("profiles")
      .upsert(payload, { onConflict: "id" });

    if (upsertErr) {
      return NextResponse.json({ error: upsertErr.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
