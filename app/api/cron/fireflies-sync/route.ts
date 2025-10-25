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
    console.log('Starting fireflies-sync cron job...')
    const supabaseAdmin = getSupabaseAdmin()
    
    // Get all users with Fireflies API keys
    const { data: users, error } = await supabaseAdmin
      .from('profiles')
      .select('id, fireflies_api_key')
      .not('fireflies_api_key', 'is', null)

    if (error) {
      console.error('Error fetching users with Fireflies keys:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!users || users.length === 0) {
      console.log('No users with Fireflies API keys found')
      return NextResponse.json({ message: 'No users with Fireflies API keys found' })
    }

    console.log(`Found ${users.length} users with Fireflies API keys`)

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    let processed = 0
    let errors = 0
    let totalRecordings = 0

    for (const user of users) {
      try {
        console.log(`Processing Fireflies for user ${user.id}...`)
        
        const response = await fetch(`${baseUrl}/api/import-fireflies`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
          },
          body: JSON.stringify({ 
            user_id: user.id,
            apiKey: user.fireflies_api_key
          })
        })
        
        if (response.ok) {
          const result = await response.json()
          processed += 1
          totalRecordings += result.recordingsImported || 0
          console.log(`Successfully processed Fireflies for user ${user.id}, imported ${result.recordingsImported || 0} recordings`)
        } else {
          errors += 1
          const errorText = await response.text()
          console.error(`Failed to sync Fireflies for user ${user.id}:`, errorText)
        }
      } catch (error) {
        errors += 1
        console.error(`Error syncing Fireflies for user ${user.id}:`, error)
      }
    }

    console.log(`Fireflies-sync cron completed: ${processed} processed, ${errors} errors, ${totalRecordings} recordings imported`)

    return NextResponse.json({
      success: true,
      processed,
      errors,
      totalRecordings,
      message: `Processed ${processed} Fireflies users, ${errors} errors, ${totalRecordings} recordings imported`
    })

  } catch (error: any) {
    console.error('Cron fireflies-sync error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
