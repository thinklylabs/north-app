import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function requireAuth() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    redirect('/signin')
  }
  return user
}

export async function getCurrentUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function getUserProfile() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    return null
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    return null
  }

  return profile
}

export async function requireAuthWithRole() {
  const profile = await getUserProfile()
  if (!profile) {
    redirect('/signin')
  }
  return profile
}

export async function requireAdmin() {
  const profile = await requireAuthWithRole()
  if (profile.role !== 'admin') {
    redirect('/dashboard')
  }
  return profile
}

export async function requireUser() {
  const profile = await requireAuthWithRole()
  if (profile.role !== 'user') {
    redirect('/admin')
  }
  return profile
}

// Type definitions for better TypeScript support
export type UserRole = 'user' | 'admin'

export interface UserProfile {
  id: string
  email: string
  first_name?: string
  last_name?: string
  website_url?: string
  company_name?: string
  website_content?: string
  role: UserRole
  created_at: string
  updated_at: string
}


