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
      .from("linkedin_users")
      .select("writing_style")
      .eq("user_id", userId)
      .not("writing_style", "is", null)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, writing_style: data?.writing_style ?? null });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const writing_style = body.writing_style;

    if (!writing_style) {
      return NextResponse.json({ error: "writing_style is required" }, { status: 400 });
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

    const { error: updateErr } = await supabase
      .from("linkedin_users")
      .update({ writing_style })
      .eq("user_id", userId);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
