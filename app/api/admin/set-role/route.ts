import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { UserRole } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if current user is admin
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (currentProfile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { userId, role }: { userId: string; role: UserRole } = await request.json()

    // Validate role is one of the allowed enum values
    const validRoles: UserRole[] = ['user', 'admin']
    if (!userId || !role || !validRoles.includes(role)) {
      return NextResponse.json({ 
        error: 'Invalid userId or role. Role must be either "user" or "admin"' 
      }, { status: 400 })
    }

    // Update user role
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', userId)

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update role' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: `Role updated to ${role}`,
      role 
    })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
