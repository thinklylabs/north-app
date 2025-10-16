import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
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

