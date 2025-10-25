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
    console.log('Starting import-manual-rss cron job...')
    const supabaseAdmin = getSupabaseAdmin()
    
    // Get all manual RSS content sources
    const { data: sources, error } = await supabaseAdmin
      .from('content_sources')
      .select('id, user_id, source_name')
      .eq('source_type', 'manual_rss')

    if (error) {
      console.error('Error fetching manual RSS sources:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!sources || sources.length === 0) {
      console.log('No manual RSS sources found')
      return NextResponse.json({ message: 'No manual RSS sources found' })
    }

    console.log(`Found ${sources.length} manual RSS sources`)

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    let processed = 0
    let errors = 0
    let totalImported = 0

    for (const source of sources) {
      try {
        console.log(`Processing manual RSS source ${source.id} for user ${source.user_id}...`)
        
        const response = await fetch(`${baseUrl}/api/import-manual-rss`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
          },
          body: JSON.stringify({ urls: [source.source_name] })
        })
        
        if (response.ok) {
          const result = await response.json()
          processed += 1
          totalImported += result.results?.filter((r: any) => r.inserted > 0).length || 0
          console.log(`Successfully processed manual RSS source ${source.id}`)
        } else {
          errors += 1
          const errorText = await response.text()
          console.error(`Failed to import manual RSS for source ${source.id}:`, errorText)
        }
      } catch (error) {
        errors += 1
        console.error(`Error importing manual RSS for source ${source.id}:`, error)
      }
    }

    console.log(`Import-manual-rss cron completed: ${processed} processed, ${errors} errors, ${totalImported} items imported`)

    return NextResponse.json({
      success: true,
      processed,
      errors,
      totalImported,
      message: `Processed ${processed} manual RSS sources, ${errors} errors, ${totalImported} items imported`
    })

  } catch (error: any) {
    console.error('Cron import-manual-rss error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
