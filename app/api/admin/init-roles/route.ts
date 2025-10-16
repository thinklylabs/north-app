import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { ROLES } from '@/lib/roles'

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all profiles without a role set
    const { data: profiles, error: fetchError } = await supabase
      .from('profiles')
      .select('id, email, role')
      .is('role', null)

    if (fetchError) {
      return NextResponse.json({ error: 'Failed to fetch profiles' }, { status: 500 })
    }

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ message: 'No profiles need role initialization' })
    }

    // Set default role as 'user' for all profiles without a role
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ role: ROLES.USER })
      .is('role', null)

    if (updateError) {
      return NextResponse.json({ error: 'Failed to initialize roles' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: `Initialized roles for ${profiles.length} profiles`,
      updatedCount: profiles.length
    })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
