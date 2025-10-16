import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ROLES } from './roles'

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

<<<<<<< Updated upstream
export async function getUserProfile() {
=======
export async function getUserProfile(): Promise<UserProfile | null> {
>>>>>>> Stashed changes
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

<<<<<<< Updated upstream
  return profile
}

export async function requireAuthWithRole() {
=======
  return profile as UserProfile
}

export async function requireAuthWithRole(): Promise<UserProfile> {
>>>>>>> Stashed changes
  const profile = await getUserProfile()
  if (!profile) {
    redirect('/signin')
  }
  return profile
}

<<<<<<< Updated upstream
export async function requireAdmin() {
  const profile = await requireAuthWithRole()
  if (profile.role !== 'admin') {
=======
export async function requireAdmin(): Promise<UserProfile> {
  const profile = await requireAuthWithRole()
  if (profile.role !== ROLES.ADMIN) {
>>>>>>> Stashed changes
    redirect('/dashboard')
  }
  return profile
}

<<<<<<< Updated upstream
export async function requireUser() {
  const profile = await requireAuthWithRole()
  if (profile.role !== 'user') {
=======
export async function requireUser(): Promise<UserProfile> {
  const profile = await requireAuthWithRole()
  if (profile.role !== ROLES.USER) {
>>>>>>> Stashed changes
    redirect('/admin')
  }
  return profile
}

<<<<<<< Updated upstream
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

=======
>>>>>>> Stashed changes

