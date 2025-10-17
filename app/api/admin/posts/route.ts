import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ROLES } from '@/lib/roles'

const STATUS_OPTIONS = new Set(['draft', 'feedback stage', 'for later', 'approved', 'posted'])

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false as const, status: 401, body: { error: 'Unauthorized' } }
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== ROLES.ADMIN) {
    return { ok: false as const, status: 403, body: { error: 'Admin access required' } }
  }
  return { ok: true as const }
}

export async function GET(request: NextRequest) {
  try {
    const gate = await requireAdmin()
    if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status })

    const admin = createAdminClient()
    const searchParams = new URL(request.url).searchParams
    const owner = searchParams.get('owner')

    let query = admin
      .from('posts')
      .select('id, post_hook, post_content, created_at, status, user_id')
      .order('created_at', { ascending: false })
      .limit(500)

    if (owner) {
      query = query.eq('user_id', owner)
    }

    const { data: posts, error: postsError } = await query

    if (postsError) {
      return NextResponse.json({ error: 'Failed to load posts' }, { status: 500 })
    }

    const userIds = Array.from(new Set((posts || []).map(p => p.user_id).filter(Boolean)))
    let profilesById: Record<string, any> = {}
    if (userIds.length > 0) {
      const { data: profiles, error: profilesError } = await admin
        .from('profiles')
        .select('id, email, first_name, last_name, company_name')
        .in('id', userIds as string[])
      if (profilesError) {
        return NextResponse.json({ error: 'Failed to load profiles' }, { status: 500 })
      }
      profilesById = (profiles || []).reduce((acc: Record<string, any>, p: any) => {
        acc[p.id] = p
        return acc
      }, {})
    }

    const merged = (posts || []).map(p => ({
      ...p,
      owner: profilesById[(p as any).user_id as string] || null,
    }))

    // Build full owners list independent of filter
    const { data: allPosts, error: allPostsError } = await admin
      .from('posts')
      .select('user_id')
      .limit(5000)
    if (allPostsError) {
      return NextResponse.json({ error: 'Failed to load owners' }, { status: 500 })
    }
    const allUserIds = Array.from(new Set((allPosts || []).map((r: any) => r.user_id).filter(Boolean)))
    let owners: any[] = []
    if (allUserIds.length > 0) {
      const { data: ownerProfiles, error: ownerProfilesError } = await admin
        .from('profiles')
        .select('id, email, first_name, last_name, company_name')
        .in('id', allUserIds as string[])
      if (ownerProfilesError) {
        return NextResponse.json({ error: 'Failed to load owners' }, { status: 500 })
      }
      owners = ownerProfiles || []
    }

    return NextResponse.json({ posts: merged, owners })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const gate = await requireAdmin()
    if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status })

    const { ids, status } = await request.json()
    if (!Array.isArray(ids) || ids.length === 0 || typeof status !== 'string' || !STATUS_OPTIONS.has(status)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { error } = await admin
      .from('posts')
      .update({ status })
      .in('id', ids)

    if (error) {
      return NextResponse.json({ error: 'Failed to update statuses' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const gate = await requireAdmin()
    if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status })

    const { ids } = await request.json()
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { error } = await admin
      .from('posts')
      .delete()
      .in('id', ids)

    if (error) {
      return NextResponse.json({ error: 'Failed to delete posts' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


