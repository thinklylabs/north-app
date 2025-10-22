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

export async function GET(_req: NextRequest) {
  const adminCheck = await requireAdminUser()
  if (!adminCheck.ok) {
    return NextResponse.json({ error: adminCheck.message }, { status: adminCheck.status })
  }

  const admin = createAdminClient()

  // Gather feedback rows and aggregate in memory for robustness with legacy/new columns
  const [postFbRes, ideaFbRes] = await Promise.all([
    admin.from('feedbacks').select('post_id,target_id,created_at').or('feedback_for.eq.post,post_id.not.is.null').limit(20000),
    admin.from('feedbacks').select('idea_id,target_id,created_at').or('feedback_for.eq.idea,idea_id.not.is.null').limit(20000),
  ])

  const postAgg = new Map<number, { count: number, last: string }>()
  for (const r of (postFbRes.data || [])) {
    const id = (r as any).post_id ?? (r as any).target_id
    if (!id) continue
    const created = (r as any).created_at as string
    const cur = postAgg.get(id)
    if (!cur) postAgg.set(id, { count: 1, last: created })
    else postAgg.set(id, { count: cur.count + 1, last: (new Date(created) > new Date(cur.last)) ? created : cur.last })
  }

  const ideaAgg = new Map<number, { count: number, last: string }>()
  for (const r of (ideaFbRes.data || [])) {
    const id = (r as any).idea_id ?? (r as any).target_id
    if (!id) continue
    const created = (r as any).created_at as string
    const cur = ideaAgg.get(id)
    if (!cur) ideaAgg.set(id, { count: 1, last: created })
    else ideaAgg.set(id, { count: cur.count + 1, last: (new Date(created) > new Date(cur.last)) ? created : cur.last })
  }

  const postIds = Array.from(postAgg.keys())
  const ideaIds = Array.from(ideaAgg.keys())

  const [{ data: posts }, { data: ideas }] = await Promise.all([
    postIds.length ? admin.from('posts').select('id,post_hook,post_content,status,created_at').in('id', postIds) : Promise.resolve({ data: [] as any[] }),
    ideaIds.length ? admin.from('ideas').select('id,idea_topic,idea_eq,idea_takeaway,status,created_at').in('id', ideaIds) : Promise.resolve({ data: [] as any[] }),
  ])

  const postsOut = (posts || []).map((p: any) => ({
    id: p.id as number,
    type: 'post' as const,
    title: p.post_hook || (p.post_content ? String(p.post_content).slice(0, 80) : ''),
    status: p.status || 'draft',
    created_at: p.created_at,
    feedback_count: postAgg.get(p.id)?.count || 0,
    last_feedback_at: postAgg.get(p.id)?.last || p.created_at,
  })).filter(x => x.feedback_count > 0)

  const ideasOut = (ideas || []).map((i: any) => ({
    id: i.id as number,
    type: 'idea' as const,
    title: i.idea_topic || 'Untitled idea',
    status: i.status || 'draft',
    created_at: i.created_at,
    feedback_count: ideaAgg.get(i.id)?.count || 0,
    last_feedback_at: ideaAgg.get(i.id)?.last || i.created_at,
  })).filter(x => x.feedback_count > 0)

  return NextResponse.json({ posts: postsOut, ideas: ideasOut })
}


