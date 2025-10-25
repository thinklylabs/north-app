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
    console.log('Starting slack-sync cron job...')
    const supabaseAdmin = getSupabaseAdmin()
    
    // Get all Slack connections
    const { data: connections, error } = await supabaseAdmin
      .from('content_sources')
      .select('id, user_id, config')
      .eq('source_type', 'slack_messages')
      .not('config->connection_id', 'is', null)

    if (error) {
      console.error('Error fetching Slack connections:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!connections || connections.length === 0) {
      console.log('No Slack connections found')
      return NextResponse.json({ message: 'No Slack connections found' })
    }

    console.log(`Found ${connections.length} Slack connections`)

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    let processed = 0
    let errors = 0
    let totalMessages = 0

    for (const connection of connections) {
      try {
        console.log(`Processing Slack connection ${connection.id} for user ${connection.user_id}...`)
        
        const response = await fetch(`${baseUrl}/api/slack/fetch-messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: connection.user_id,
            connectionId: connection.config.connection_id,
            providerConfigKey: 'slack'
          })
        })
        
        if (response.ok) {
          const result = await response.json()
          processed += 1
          totalMessages += result.messageCount || 0
          console.log(`Successfully processed Slack connection ${connection.id}, fetched ${result.messageCount} messages`)
        } else {
          errors += 1
          const errorText = await response.text()
          console.error(`Failed to sync Slack for connection ${connection.id}:`, errorText)
        }
      } catch (error) {
        errors += 1
        console.error(`Error syncing Slack for connection ${connection.id}:`, error)
      }
    }

    console.log(`Slack-sync cron completed: ${processed} processed, ${errors} errors, ${totalMessages} messages fetched`)

    return NextResponse.json({
      success: true,
      processed,
      errors,
      totalMessages,
      message: `Processed ${processed} Slack connections, ${errors} errors, ${totalMessages} messages fetched`
    })

  } catch (error: any) {
    console.error('Cron slack-sync error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
