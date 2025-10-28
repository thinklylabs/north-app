import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerSupabase } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get user's LinkedIn account info
    const { data: linkedinUser, error: accountError } = await supabase
      .from('linkedin_users')
      .select('account_id, provider_id, writing_style')
      .eq('user_id', user.id)
      .not('account_id', 'is', null)
      .single();

    if (accountError || !linkedinUser) {
      return NextResponse.json({ error: "LinkedIn account not connected" }, { status: 400 });
    }

    // Fetch posts from Unipile
    const baseUrl = process.env.UNIPILE_DSN?.replace(/\/$/, "");
    const apiKey = process.env.UNIPILE_TOKEN;
    
    if (!baseUrl || !apiKey) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const postsUrl = `${baseUrl}/api/v1/users/${encodeURIComponent(linkedinUser.provider_id)}/posts?account_id=${encodeURIComponent(linkedinUser.account_id)}`;
    
    const postsResp = await fetch(postsUrl, {
      method: "GET",
      headers: { "X-API-KEY": apiKey, accept: "application/json" },
      cache: "no-store",
    });

    if (!postsResp.ok) {
      return NextResponse.json({ error: "Failed to fetch posts" }, { status: 500 });
    }

    const postsData = await postsResp.json();
    const posts = Array.isArray(postsData) ? postsData : Array.isArray(postsData?.items) ? postsData.items : [];
    
    // Count non-repost posts
    const nonRepostPosts = posts.filter((post: any) => !post.is_repost);
    const postCount = nonRepostPosts.length;

    return NextResponse.json({ 
      success: true, 
      postCount,
      hasWritingStyle: !!linkedinUser.writing_style 
    });

  } catch (error) {
    console.error("[linkedin/posts-count] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
