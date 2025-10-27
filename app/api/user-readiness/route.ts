import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkUserReadiness } from '@/lib/userReadiness'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const readinessStatus = await checkUserReadiness(user.id)
    
    return NextResponse.json(readinessStatus)
  } catch (error) {
    console.error('Error checking user readiness:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}
