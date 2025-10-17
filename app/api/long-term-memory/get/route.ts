import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserLongTermMemory } from '@/lib/longTermMemory'

/**
 * API endpoint to retrieve long-term memory for the authenticated user
 */
export async function GET(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await getUserLongTermMemory(user.id)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      memory: result.memory
    }, { status: 200 })

  } catch (error) {
    console.error('Error retrieving long-term memory:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * API endpoint to update long-term memory for the authenticated user
 */
export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const memory_content: string | undefined = typeof body.memory_content === 'string' ? body.memory_content : undefined

    if (!memory_content || !memory_content.trim()) {
      return NextResponse.json({ error: 'memory_content is required' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { error } = await admin
      .from('user_long_term_memory')
      .upsert({
        user_id: user.id,
        memory_content,
        last_updated: new Date().toISOString()
      }, { onConflict: 'user_id' })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating long-term memory:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

