import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
<<<<<<< Updated upstream
import { UserRole } from '@/lib/auth'
=======
>>>>>>> Stashed changes

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
<<<<<<< Updated upstream
    const defaultRole: UserRole = 'user'
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ role: defaultRole })
=======
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ role: 'user' })
>>>>>>> Stashed changes
      .is('role', null)

    if (updateError) {
      return NextResponse.json({ error: 'Failed to initialize roles' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: `Initialized roles for ${profiles.length} profiles`,
<<<<<<< Updated upstream
      updatedCount: profiles.length,
      defaultRole
=======
      updatedCount: profiles.length
>>>>>>> Stashed changes
    })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
