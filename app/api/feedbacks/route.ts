import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url) throw new Error('Missing SUPABASE_URL environment variable')
  if (!serviceKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable')
  return createClient(url, serviceKey)
}

export async function POST(req: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin()

    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const accessToken = authHeader.replace('Bearer ', '')

    const { data: { user }, error: userErr } = await supabaseAdmin.auth.getUser(accessToken)
    if (userErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({})) as {
      feedback_for?: string
      target_id?: number
      feedback?: string
    }

    let feedback_for = (body.feedback_for || '').toLowerCase().trim()
    const target_id = Number(body.target_id)
    const feedback = (body.feedback || '').trim()

    // Allowed values must match DB check constraint
    const ALLOWED = new Set(['insight', 'hook', 'post', 'idea'])
    if (!ALLOWED.has(feedback_for)) {
      return NextResponse.json({ error: 'Invalid feedback_for' }, { status: 400 })
    }
    if (!Number.isFinite(target_id) || !feedback) {
      return NextResponse.json({ error: 'Missing target_id or feedback' }, { status: 400 })
    }

    const { error: insertErr } = await supabaseAdmin
      .from('feedbacks')
      .insert({
        user_id: user.id,
        feedback_for,
        target_id,
        feedback,
      })

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 400 })
    }

    return NextResponse.json({ message: 'Feedback submitted' })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 })
  }
}


