import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerSupabase } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    // Authentication
    const supabase = await createServerSupabase();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { imageData } = await req.json();
    
    if (!imageData) {
      return NextResponse.json({ error: "Image data is required" }, { status: 400 });
    }

    // Convert base64 data URL to buffer
    const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Create unique filename with user ID prefix
    const fileName = `${user.id}/linkedin-${Date.now()}.jpg`;
    
    // Upload to Supabase Storage using admin client
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    const { data, error } = await supabaseAdmin.storage
      .from('linkedin-images')
      .upload(fileName, buffer, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: false
      });
      
    if (error) {
      console.error("Storage upload error:", error);
      return NextResponse.json({ error: "Failed to upload image" }, { status: 500 });
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('linkedin-images')
      .getPublicUrl(fileName);
    
    console.log("[upload-linkedin-image] Image uploaded successfully:", { fileName, publicUrl });
    
    return NextResponse.json({ 
      success: true, 
      imageUrl: publicUrl,
      fileName: fileName 
    });
    
  } catch (error: any) {
    console.error("Image upload error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
