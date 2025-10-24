import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerSupabase } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    // Authentication
    const supabase = await createServerSupabase();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { postId, imageData } = await req.json();
    
    if (!postId) {
      return NextResponse.json({ error: "Post ID is required" }, { status: 400 });
    }

    // Get post content
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('post_hook, post_content, user_id')
      .eq('id', postId)
      .eq('user_id', user.id)
      .single();

    if (postError || !post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Get user's LinkedIn account_id from linkedin_users table
    console.log("[linkedin/post] Looking for LinkedIn account for user:", user.id);
    const { data: linkedinUsers, error: accountError } = await supabase
      .from('linkedin_users')
      .select('account_id, user_id, provider_id')
      .eq('user_id', user.id)
      .not('account_id', 'is', null);

    console.log("[linkedin/post] LinkedIn account lookup result:", { linkedinUsers, accountError });

    if (accountError || !linkedinUsers || linkedinUsers.length === 0) {
      console.log("[linkedin/post] LinkedIn account not found, checking all linkedin_users...");
      const { data: allLinkedinUsers } = await supabase
        .from('linkedin_users')
        .select('account_id, user_id, provider_id')
        .limit(10);
      console.log("[linkedin/post] All linkedin_users:", allLinkedinUsers);
      return NextResponse.json({ error: "LinkedIn account not connected" }, { status: 400 });
    }

    // Get the first valid LinkedIn account
    const linkedinUser = linkedinUsers[0];
    console.log("[linkedin/post] Using LinkedIn account:", linkedinUser);

    // Unipile API call
    const baseUrl = (process.env.UNIPILE_DSN || "").replace(/\/$/, "");
    const apiToken = process.env.UNIPILE_TOKEN;
    
    if (!baseUrl || !apiToken) {
      return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
    }

    const postData: any = {
      provider: "LINKEDIN",
      account_id: linkedinUser.account_id,
      text: post.post_content || post.post_hook,
    };

    // Handle image - try different approaches
    if (imageData) {
      try {
        let imageUrl = null;
        
        // First, ensure we have a public URL
        if (imageData.startsWith('http')) {
          // Already uploaded to Supabase, use the URL directly
          imageUrl = imageData;
          console.log("[linkedin/post] Using already uploaded image:", imageUrl);
        } else {
          // Base64 data, need to upload to Supabase first
          console.log("[linkedin/post] Uploading image to Supabase storage...");
          const uploadResponse = await fetch('/api/upload-linkedin-image', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
            },
            body: JSON.stringify({ imageData })
          });
          
          if (uploadResponse.ok) {
            const uploadResult = await uploadResponse.json();
            imageUrl = uploadResult.imageUrl;
            console.log("[linkedin/post] Image uploaded to Supabase:", imageUrl);
          } else {
            console.error("[linkedin/post] Supabase upload failed:", await uploadResponse.text());
            throw new Error("Failed to upload image to Supabase");
          }
        }
        
        // Add image using media field (correct format for Unipile)
        if (imageUrl) {
          console.log("[linkedin/post] Adding image URL to post data:", imageUrl);
          
          // Use media field for image attachment
          postData.media = [{
            type: "image",
            url: imageUrl
          }];
          
          console.log("[linkedin/post] Added image to media field");
        }
      } catch (error) {
        console.error("[linkedin/post] Image processing error:", error);
        return NextResponse.json({ 
          error: `Failed to process image: ${error instanceof Error ? error.message : String(error)}` 
        }, { status: 500 });
      }
    }

    console.log("[linkedin/post] Posting to Unipile with data:", postData);
    console.log("[linkedin/post] Unipile URL:", `${baseUrl}/api/v1/posts`);
    console.log("[linkedin/post] Has image:", !!imageData);
    console.log("[linkedin/post] Post data structure:", JSON.stringify(postData, null, 2));

    const response = await fetch(`${baseUrl}/api/v1/posts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": apiToken,
      },
      body: JSON.stringify(postData),
    });

    console.log("[linkedin/post] Unipile response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[linkedin/post] Unipile error response:", errorText);
      return NextResponse.json({ 
        error: `LinkedIn posting failed: ${response.status} ${errorText}` 
      }, { status: 500 });
    }

    const result = await response.json();
    console.log("[linkedin/post] Unipile success response:", result);

    // Update post status to "posted"
    const { error: updateError } = await supabase
      .from('posts')
      .update({ status: 'posted' })
      .eq('id', postId);

    if (updateError) {
      console.error("Failed to update post status:", updateError);
      // Don't fail the request since LinkedIn posting succeeded
    }

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error("LinkedIn posting error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
