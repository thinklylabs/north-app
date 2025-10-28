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
    const owner = searchParams.get('owner') // optional owner filter (profile id)

    // Fetch ideas (optionally filter by owner)
    let ideasQuery = admin
      .from('ideas')
      .select('id, idea_topic, idea_eq, idea_takeaway, created_at, status, user_id')
      .order('created_at', { ascending: false })
      .limit(1000)

    if (owner) {
      ideasQuery = ideasQuery.eq('user_id', owner)
    }

    const { data: ideas, error: ideasError } = await ideasQuery
    if (ideasError) {
      return NextResponse.json({ error: 'Failed to load ideas' }, { status: 500 })
    }

    // Aggregate feedback counts for the fetched ideas
    const ideaIds = Array.from(new Set((ideas || []).map((i: any) => i.id)))
    const ideaAgg = new Map<number, { count: number, last: string }>()
    if (ideaIds.length > 0) {
      const orClause = `idea_id.in.(${ideaIds.join(',')}),and(feedback_for.eq.idea,target_id.in.(${ideaIds.join(',')}))`
      const { data: fbRows } = await admin
        .from('feedbacks')
        .select('idea_id,target_id,created_at')
        .or(orClause)
        .limit(20000)
      for (const r of (fbRows || [])) {
        const id = (r as any).idea_id ?? (r as any).target_id
        if (!id) continue
        const created = (r as any).created_at as string
        const cur = ideaAgg.get(id)
        if (!cur) ideaAgg.set(id, { count: 1, last: created })
        else ideaAgg.set(id, { count: cur.count + 1, last: (new Date(created) > new Date(cur.last)) ? created : cur.last })
      }
    }

    const userIds = Array.from(new Set((ideas || []).map(i => i.user_id).filter(Boolean)))
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

    const merged = (ideas || []).map(i => ({
      ...i,
      owner: profilesById[(i as any).user_id as string] || null,
      feedback_count: ideaAgg.get((i as any).id)?.count || 0,
      last_feedback_at: ideaAgg.get((i as any).id)?.last || (i as any).created_at,
    }))
    // Build full owners list independent of filter
    const { data: allIdeas, error: allIdeasError } = await admin
      .from('ideas')
      .select('user_id')
      .limit(5000)
    if (allIdeasError) {
      return NextResponse.json({ error: 'Failed to load owners' }, { status: 500 })
    }
    const allUserIds = Array.from(new Set((allIdeas || []).map((r: any) => r.user_id).filter(Boolean)))
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

    return NextResponse.json({ ideas: merged, owners })
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
      .from('ideas')
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
      .from('ideas')
      .delete()
      .in('id', ids)

    if (error) {
      return NextResponse.json({ error: 'Failed to delete ideas' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


