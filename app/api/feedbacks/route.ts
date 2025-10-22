import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabaseForUser(accessToken: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')
  if (!anonKey) throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY')
  return createClient(url, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  })
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const accessToken = authHeader.replace('Bearer ', '')
    const supabase = getSupabaseForUser(accessToken)

    const { data: { user }, error: userErr } = await supabase.auth.getUser()
    if (userErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const postIdParam = searchParams.get('postId')
    const ideaIdParam = searchParams.get('ideaId')

    const postId = postIdParam ? Number(postIdParam) : undefined
    const ideaId = ideaIdParam ? Number(ideaIdParam) : undefined
    if ((!postId && !ideaId) || (postId && ideaId)) {
      return NextResponse.json({ error: 'Provide either postId or ideaId' }, { status: 400 })
    }

    // Authorization: end users may only read feedback for THEIR OWN post/idea
    if (postId) {
      const { data: postOwner } = await supabase
        .from('posts')
        .select('user_id')
        .eq('id', postId)
        .maybeSingle()
      if (!postOwner || postOwner.user_id !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }
    if (ideaId) {
      const { data: ideaOwner } = await supabase
        .from('ideas')
        .select('user_id')
        .eq('id', ideaId)
        .maybeSingle()
      if (!ideaOwner || ideaOwner.user_id !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    // Fetch feedback rows for target. We keep compatibility with existing schema
    // by querying with (feedback_for, target_id)
    const targetType = postId ? 'post' : 'idea'
    const targetId = (postId || ideaId) as number

    const { data: feedbackRows, error: feedbackErr } = await supabase
      .from('feedbacks')
      .select('id, user_id, feedback, created_at')
      .eq('feedback_for', targetType)
      .eq('target_id', targetId)
      .order('created_at', { ascending: true })

    if (feedbackErr) {
      return NextResponse.json({ error: feedbackErr.message }, { status: 400 })
    }

    const authorIds = Array.from(new Set((feedbackRows || []).map(r => r.user_id)))
    let authorRoles: Record<string, 'admin' | 'user'> = {}
    if (authorIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, role')
        .in('id', authorIds as string[])
      for (const p of profiles || []) {
        authorRoles[p.id as unknown as string] = (p.role === 'admin') ? 'admin' : 'user'
      }
    }

    // Insight resolution for display
    let insightPayload: any = null
    if (postId) {
      const { data: post } = await supabase
        .from('posts')
        .select('insight_id')
        .eq('id', postId)
        .single()
      const insightId = (post?.insight_id as number | null) ?? null
      if (insightId) {
        const { data: insight } = await supabase
          .from('insights')
          .select('id, insight')
          .eq('id', insightId)
          .maybeSingle()
        if (insight) insightPayload = insight
      }
    } else if (ideaId) {
      const { data: insight } = await supabase
        .from('insights')
        .select('id, insight')
        .eq('idea_id', ideaId)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()
      if (insight) insightPayload = insight
    }

    const messages = (feedbackRows || []).map(r => ({
      id: r.id,
      authorUserId: r.user_id,
      authorRole: authorRoles[r.user_id] || 'user',
      body: r.feedback,
      createdAt: r.created_at,
    }))

    return NextResponse.json({
      targetType,
      targetId,
      insight: insightPayload,
      messages,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const accessToken = authHeader.replace('Bearer ', '')
    const supabase = getSupabaseForUser(accessToken)

    const { data: { user }, error: userErr } = await supabase.auth.getUser()
    if (userErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({})) as {
      feedback_for?: string
      target_id?: number
      targetType?: string
      targetId?: number
      feedback?: string
    }

    // Support both legacy and new field names
    let feedback_for = (body.feedback_for || body.targetType || '').toLowerCase().trim()
    const target_id = Number(body.target_id ?? body.targetId)
    const feedback = (body.feedback || '').trim()

    // Allowed values must match DB check constraint
    const ALLOWED = new Set(['insight', 'hook', 'post', 'idea'])
    if (!ALLOWED.has(feedback_for)) {
      return NextResponse.json({ error: 'Invalid feedback_for' }, { status: 400 })
    }
    if (!Number.isFinite(target_id) || !feedback) {
      return NextResponse.json({ error: 'Missing target_id or feedback' }, { status: 400 })
    }

    // Derive normalized columns
    const targetTypeNormalized = (feedback_for === 'post' || feedback_for === 'idea') ? feedback_for : null
    const postIdNormalized = targetTypeNormalized === 'post' ? target_id : null
    const ideaIdNormalized = targetTypeNormalized === 'idea' ? target_id : null

    // Determine author_role snapshot; enforce ownership for all callers
    let authorRole: 'user' | 'admin' = 'user'
    {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()
      if (profile?.role === 'admin') authorRole = 'admin'
    }

    if (postIdNormalized) {
      const { data: postOwner } = await supabase
        .from('posts')
        .select('user_id')
        .eq('id', postIdNormalized)
        .maybeSingle()
      if (!postOwner || postOwner.user_id !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }
    if (ideaIdNormalized) {
      const { data: ideaOwner } = await supabase
        .from('ideas')
        .select('user_id')
        .eq('id', ideaIdNormalized)
        .maybeSingle()
      if (!ideaOwner || ideaOwner.user_id !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    // Fill insight_id from target if available
    let insightIdNormalized: number | null = null
    if (postIdNormalized) {
      const { data: postRow } = await supabase
        .from('posts')
        .select('insight_id')
        .eq('id', postIdNormalized)
        .single()
      insightIdNormalized = (postRow?.insight_id as number | null) ?? null
    } else if (ideaIdNormalized) {
      const { data: ideaInsight } = await supabase
        .from('insights')
        .select('id')
        .eq('idea_id', ideaIdNormalized)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()
      insightIdNormalized = (ideaInsight?.id as number | null) ?? null
    }

    const { error: insertErr } = await supabase
      .from('feedbacks')
      .insert({
        user_id: user.id,
        feedback_for,
        target_id,
        feedback,
        // normalized fields
        target_type: targetTypeNormalized,
        post_id: postIdNormalized,
        idea_id: ideaIdNormalized,
        author_role: authorRole,
        insight_id: insightIdNormalized,
      })

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 400 })
    }

    return NextResponse.json({ message: 'Feedback submitted' })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 })
  }
}


