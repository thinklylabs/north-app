import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const { icp, icp_pain_points } = await req.json();

    if (typeof icp !== "string" || !icp.trim()) {
      return NextResponse.json({ error: "icp is required" }, { status: 400 });
    }
    if (typeof icp_pain_points !== "string" || !icp_pain_points.trim()) {
      return NextResponse.json({ error: "icp_pain_points is required" }, { status: 400 });
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
    const { error: upsertErr } = await supabase
      .from("profiles")
      .upsert(
        {
          id: userId,
          icp,
          icp_pain_points,
        },
        { onConflict: "id" }
      );

    if (upsertErr) {
      return NextResponse.json({ error: upsertErr.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}



