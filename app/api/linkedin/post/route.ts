import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

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
      .select('id, post_hook, post_content, user_id')
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

    // Send email notification to admin after successful LinkedIn posting
    // This is wrapped in try-catch so email failures don't affect the posting success
    try {
      if (!process.env.RESEND_API_KEY) {
        throw new Error('RESEND_API_KEY not configured');
      }

      // Get user profile information for the email
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('email, first_name, last_name, company_name')
        .eq('id', user.id)
        .single();

      const userEmail = user?.email || 'Unknown User';
      const userName = userProfile?.first_name && userProfile?.last_name
        ? `${userProfile.first_name} ${userProfile.last_name}`
        : userProfile?.first_name || user?.email || 'No Name Provided';
      const companyName = userProfile?.company_name || 'No Company';

      // Get post content and hook for email
      const postContent = post.post_content || 'No content available';
      const postHook = post.post_hook || 'No hook available';
      const truncatedContent = postContent.length > 300
        ? postContent.substring(0, 300) + '...'
        : postContent;

      const emailPayload = {
        from: `North Update <${process.env.ADMIN_EMAIL}>`,
        to: 'ansh.shetty.22@gmail.com',
        subject: ` ${userName} posted on LinkedIn!`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #0077b5; margin-bottom: 20px;">🚀 LinkedIn Post Published!</h2>
            
            <div style="background-color: #f8f9fa; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
              <p style="margin: 0 0 8px 0;"><strong>User:</strong> ${userName}</p>
              <p style="margin: 0 0 8px 0;"><strong>Email:</strong> ${userEmail}</p>
              <p style="margin: 0 0 8px 0;"><strong>Company:</strong> ${companyName}</p>
              <p style="margin: 0;"><strong>Post ID:</strong> ${post.id}</p>
            </div>

            <div style="background-color: #fff3cd; padding: 12px; border-radius: 6px; margin: 16px 0; border-left: 4px solid #ffc107;">
              <p style="margin: 0 0 8px 0; color: #856404; font-weight: 600;">Post Hook:</p>
              <p style="margin: 0; color: #856404; font-style: italic;">${postHook}</p>
            </div>

            <p style="margin-bottom: 8px;"><strong>Full Post Content:</strong></p>
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 10px 0; border-left: 4px solid #0077b5; line-height: 1.5;">
              ${truncatedContent.replace(/\n/g, '<br>')}
            </div>

            <div style="background-color: #d1ecf1; padding: 12px; border-radius: 6px; margin: 16px 0;">
              <p style="margin: 0; color: #0c5460; font-size: 14px;">
                <strong>Status:</strong> Successfully published to LinkedIn ✅
              </p>
            </div>

            <p style="margin: 16px 0; color: #666; font-size: 13px;"><em>Posted: ${new Date().toLocaleString()}</em></p>
            
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="font-size: 12px; color: #666; margin: 0;">
              This notification was sent because ${userName} successfully posted content to LinkedIn using North.
            </p>
            <p style="font-size: 11px; color: #999; margin: 8px 0 0 0;">
              Please do not reply to this email. Use the North platform to manage content.
            </p>
          </div>
        `,
      }
      const sendResult = await resend.emails.send(emailPayload);
    } catch (emailError: any) {
      console.error('LinkedIn post notification email failed:', emailError.message);
      // Don't fail the request - LinkedIn posting was still successful
    }

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error("LinkedIn posting error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
