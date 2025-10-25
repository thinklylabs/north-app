import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) throw new Error('Missing Supabase credentials')
  return createClient(url, serviceKey)
}

export async function GET(req: NextRequest) {
  try {
    console.log('Starting generate-memory cron job...')
    const supabaseAdmin = getSupabaseAdmin()
    
    // Get all users who need memory generation
    const { data: users, error } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .not('id', 'is', null)

    if (error) {
      console.error('Error fetching users:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!users || users.length === 0) {
      console.log('No users found')
      return NextResponse.json({ message: 'No users found' })
    }

    console.log(`Found ${users.length} users for memory generation`)

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    let processed = 0
    let errors = 0
    let totalMemories = 0

    for (const user of users) {
      try {
        console.log(`Generating memory for user ${user.id}...`)
        
        const response = await fetch(`${baseUrl}/api/long-term-memory/generate`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
          },
          body: JSON.stringify({ user_id: user.id })
        })
        
        if (response.ok) {
          const result = await response.json()
          processed += 1
          totalMemories += 1
          console.log(`Successfully generated memory for user ${user.id}`)
        } else {
          errors += 1
          const errorText = await response.text()
          console.error(`Failed to generate memory for user ${user.id}:`, errorText)
        }
      } catch (error) {
        errors += 1
        console.error(`Error generating memory for user ${user.id}:`, error)
      }
    }

    console.log(`Generate-memory cron completed: ${processed} processed, ${errors} errors, ${totalMemories} memories generated`)

    return NextResponse.json({
      success: true,
      processed,
      errors,
      totalMemories,
      message: `Processed ${processed} users, ${errors} errors, ${totalMemories} memories generated`
    })

  } catch (error: any) {
    console.error('Cron generate-memory error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
