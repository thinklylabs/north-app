import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateLongTermMemory } from '@/lib/longTermMemory'

/**
 * API endpoint to generate/update long-term memory for the authenticated user
 * This can be called manually or triggered via cron
 */
export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Admin-only: require explicit user_id; block normal users
    const body = await req.json().catch(() => ({}))
    const targetUserId = body?.user_id

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!targetUserId || typeof targetUserId !== 'string') {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 })
    }

    console.log(`Generating long-term memory for user: ${targetUserId}`)
    const result = await generateLongTermMemory(targetUserId)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Long-term memory generated successfully',
      memoryId: result.memoryId
    }, { status: 200 })

  } catch (error) {
    console.error('Error in long-term memory generation API:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

