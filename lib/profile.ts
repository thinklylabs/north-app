"use client";

import { supabase } from "@/lib/supabase-client";

export type ProfileRecord = {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  website_url: string | null;
  company_name: string | null;
  website_content: string | null;
  created_at?: string;
  updated_at?: string;
};

export async function upsertCurrentUserProfile(): Promise<{ ok: boolean; error?: string }> {
  const { data: userResult, error: userError } = await supabase.auth.getUser();
  if (userError || !userResult?.user) {
    return { ok: false, error: userError?.message || "No authenticated user" };
  }

  const user = userResult.user;
  const email = user.email ?? null;

  // Derive names from various identity providers' metadata
  const meta: Record<string, unknown> = (user.user_metadata || {}) as Record<string, unknown>;
  const identities = (user.identities as any[]) || [];
  const identityData = identities[0]?.identity_data || {};

  const rawFirst = (meta.first_name as string) || (identityData.given_name as string) || (identityData.first_name as string) || (meta.given_name as string) || "";
  const rawLast = (meta.last_name as string) || (identityData.family_name as string) || (identityData.last_name as string) || (meta.family_name as string) || "";
  const rawFull = (meta.full_name as string) || (meta.name as string) || (identityData.name as string) || "";

  let derivedFirst = rawFirst?.trim();
  let derivedLast = rawLast?.trim();
  if (!derivedFirst && !derivedLast && rawFull) {
    const parts = rawFull.trim().split(/\s+/);
    derivedFirst = parts[0] || "";
    derivedLast = parts.slice(1).join(" ") || "";
  }

  const firstName = derivedFirst || null;
  const lastName = derivedLast || null;

  // Read existing profile to avoid overwriting with nulls
  const { data: existing } = await supabase
    .from("profiles")
    .select("id,email,first_name,last_name,website_url,company_name,website_content,created_at,updated_at")
    .eq("id", user.id)
    .maybeSingle();

  const payload: ProfileRecord = {
    id: user.id,
    email: email ?? existing?.email ?? null,
    first_name: firstName ?? existing?.first_name ?? null,
    last_name: lastName ?? existing?.last_name ?? null,
    website_url: existing?.website_url ?? null,
    company_name: existing?.company_name ?? null,
    website_content: existing?.website_content ?? null,
  };

  const { error } = await supabase.from("profiles").upsert(payload, {
    onConflict: "id",
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

// NEW: Function to update profile with website data
export async function updateUserProfile(
  websiteUrl: string, 
  companyName: string
): Promise<{ ok: boolean; error?: string; profile?: ProfileRecord }> {
  const { data: userResult, error: userError } = await supabase.auth.getUser();
  if (userError || !userResult?.user) {
    return { ok: false, error: userError?.message || "No authenticated user" };
  }

  const user = userResult.user;
  
  // TODO: Add Tavily scraping here
  let websiteContent = '';
  // const scrapedData = await scrapeWebsite(websiteUrl);
  // websiteContent = scrapedData.content;

  const { data, error } = await supabase
    .from("profiles")
    .update({
      website_url: websiteUrl,
      company_name: companyName,
      website_content: websiteContent,
    })
    .eq('id', user.id)
    .select()
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, profile: data };
}

// NEW: Function to get user profile
export async function getUserProfile(): Promise<{ ok: boolean; error?: string; profile?: ProfileRecord }> {
  const { data: userResult, error: userError } = await supabase.auth.getUser();
  if (userError || !userResult?.user) {
    return { ok: false, error: userError?.message || "No authenticated user" };
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq('id', userResult.user.id)
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, profile: data };
}