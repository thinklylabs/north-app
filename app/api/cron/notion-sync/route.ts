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
    console.log('Starting notion-sync cron job...')
    const supabaseAdmin = getSupabaseAdmin()
    
    // Get all Notion connections
    const { data: connections, error } = await supabaseAdmin
      .from('content_sources')
      .select('id, user_id, config')
      .eq('source_type', 'notion')
      .not('config->connection_id', 'is', null)

    if (error) {
      console.error('Error fetching Notion connections:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!connections || connections.length === 0) {
      console.log('No Notion connections found')
      return NextResponse.json({ message: 'No Notion connections found' })
    }

    console.log(`Found ${connections.length} Notion connections`)

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    let processed = 0
    let errors = 0
    let totalPages = 0

    for (const connection of connections) {
      try {
        console.log(`Processing Notion connection ${connection.id} for user ${connection.user_id}...`)
        
        const response = await fetch(`${baseUrl}/api/notion/import`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: connection.user_id,
            connectionId: connection.config.connection_id,
            providerConfigKey: 'notion'
          })
        })
        
        if (response.ok) {
          const result = await response.json()
          processed += 1
          totalPages += result.pagesImported || 0
          console.log(`Successfully processed Notion connection ${connection.id}, imported ${result.pagesImported || 0} pages`)
        } else {
          errors += 1
          const errorText = await response.text()
          console.error(`Failed to sync Notion for connection ${connection.id}:`, errorText)
        }
      } catch (error) {
        errors += 1
        console.error(`Error syncing Notion for connection ${connection.id}:`, error)
      }
    }

    console.log(`Notion-sync cron completed: ${processed} processed, ${errors} errors, ${totalPages} pages imported`)

    return NextResponse.json({
      success: true,
      processed,
      errors,
      totalPages,
      message: `Processed ${processed} Notion connections, ${errors} errors, ${totalPages} pages imported`
    })

  } catch (error: any) {
    console.error('Cron notion-sync error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
