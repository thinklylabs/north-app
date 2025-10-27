import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) throw new Error('Missing Supabase env')
  return createSupabaseAdminClient(url, serviceKey)
}

export async function GET(req: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    
    console.log('Starting weekly Tavily cron job...')
    
    // Get all users with themes
    const { data: profiles, error } = await supabaseAdmin
      .from('profiles')
      .select('id, themes')
      .not('themes', 'is', null)
      .not('themes', 'eq', '[]')

    if (error) {
      console.error('Error fetching profiles:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!profiles || profiles.length === 0) {
      console.log('No users with themes found')
      return NextResponse.json({ 
        success: true, 
        message: 'No users with themes found',
        processed_users: 0 
      })
    }

    console.log(`Found ${profiles.length} users with themes`)

    const results = []
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    
    for (const profile of profiles) {
      if (profile.themes && profile.themes.length > 0) {
        try {
          console.log(`Processing user ${profile.id} with themes: ${profile.themes.join(', ')}`)
          
          const searchResponse = await fetch(`${baseUrl}/api/tavily/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_id: profile.id,
              themes: profile.themes
            })
          })

          const searchResult = await searchResponse.json()
          
          results.push({
            user_id: profile.id,
            success: searchResponse.ok,
            result: searchResult,
            themes: profile.themes
          })

          if (searchResponse.ok) {
            console.log(`Successfully processed user ${profile.id}`)
          } else {
            console.error(`Failed to process user ${profile.id}:`, searchResult.error)
          }
        } catch (error: any) {
          console.error(`Error processing user ${profile.id}:`, error)
          results.push({
            user_id: profile.id,
            success: false,
            error: error.message,
            themes: profile.themes
          })
        }
      }
    }

    const successCount = results.filter(r => r.success).length
    const failureCount = results.filter(r => !r.success).length

    console.log(`Weekly cron completed: ${successCount} successful, ${failureCount} failed`)

    return NextResponse.json({
      success: true,
      processed_users: results.length,
      successful: successCount,
      failed: failureCount,
      results: results
    })

  } catch (error: any) {
    console.error('Weekly cron error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
