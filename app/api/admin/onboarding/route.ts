import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerSupabase } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ROLES } from '@/lib/roles'

async function requireAdminUser() {
  const supabase = await createServerSupabase()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { ok: false as const, status: 401, message: 'Unauthorized' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== ROLES.ADMIN) {
    return { ok: false as const, status: 403, message: 'Admin access required' }
  }
  return { ok: true as const }
}

export async function GET(req: NextRequest) {
  const adminCheck = await requireAdminUser()
  if (!adminCheck.ok) {
    return NextResponse.json({ error: adminCheck.message }, { status: adminCheck.status })
  }

  const url = new URL(req.url)
  const userId = url.searchParams.get('userId')?.trim() || null

  const admin = createAdminClient()

  if (!userId) {
    // List users for dropdown
    const { data: users, error } = await admin
      .from('profiles')
      .select('id,email,first_name,last_name,role')
      .order('first_name', { ascending: true })
      .order('last_name', { ascending: true })
      .limit(500)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ users: users || [] })
  }

  // Fetch details for a single user
  // First, select base profile fields (works even if onboarding_summary/themes aren't created yet)
  const [{ data: profileBase, error: profileBaseErr }, { data: connections, error: connErr }, { data: ltm, error: ltmErr }] = await Promise.all([
    admin.from('profiles').select('id,email,first_name,last_name,website_url,company_name,website_content,icp,icp_pain_points,role,created_at,updated_at').eq('id', userId).single(),
    admin.from('nango_connections').select('provider_config_key,connection_id,created_at').eq('user_id', userId),
    admin.from('user_long_term_memory').select('memory_content,last_updated').eq('user_id', userId).maybeSingle(),
  ])

  if (profileBaseErr) {
    return NextResponse.json({ error: profileBaseErr.message }, { status: 404 })
  }
  if (connErr) {
    return NextResponse.json({ error: connErr.message }, { status: 500 })
  }
  if (ltmErr && ltmErr.code !== 'PGRST116') {
    return NextResponse.json({ error: ltmErr.message }, { status: 500 })
  }

  // Best-effort fetch of onboarding_summary and themes; ignore if column doesn't exist yet
  let onboarding_summary: string | null = null
  let themes: unknown = []
  try {
    const { data: withSummary } = await admin
      .from('profiles')
      .select('onboarding_summary,themes')
      .eq('id', userId)
      .maybeSingle()
    onboarding_summary = (withSummary as any)?.onboarding_summary ?? null
    themes = (withSummary as any)?.themes ?? []
  } catch {
    onboarding_summary = null
    themes = []
  }

  const profile = { ...profileBase, onboarding_summary, themes }
  return NextResponse.json({ profile, integrations: connections || [], long_term_memory: ltm || null })
}

export async function POST(req: NextRequest) {
  const adminCheck = await requireAdminUser()
  if (!adminCheck.ok) {
    return NextResponse.json({ error: adminCheck.message }, { status: adminCheck.status })
  }

  const body = await req.json().catch(() => ({})) as { userId?: string, onboarding_summary?: string, themes?: unknown }
  const userId = body?.userId?.trim()
  const onboarding_summary = (body?.onboarding_summary ?? '').toString()
  const inputThemes = body?.themes

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Build update payload dynamically
  const updatePayload: Record<string, unknown> = {}
  if (body.hasOwnProperty('onboarding_summary')) {
    updatePayload.onboarding_summary = onboarding_summary
  }

  if (Array.isArray(inputThemes)) {
    // Validate themes: up to 4 non-empty strings (trimmed)
    const sanitized = inputThemes
      .map((t) => (typeof t === 'string' ? t.trim() : ''))
      .filter((t) => t.length > 0)
      .slice(0, 4)
    updatePayload.themes = sanitized
  }

  if (Object.keys(updatePayload).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const { error } = await admin
    .from('profiles')
    .update(updatePayload)
    .eq('id', userId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}


