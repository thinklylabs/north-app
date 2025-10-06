import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url) throw new Error('Missing SUPABASE_URL environment variable')
  if (!serviceKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable')
  return createClient(url, serviceKey)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, connectionId, providerConfigKey } = body

    if (!userId || !connectionId) {
      return NextResponse.json({ error: 'Missing userId or connectionId' }, { status: 400 })
    }

    const supabaseAdmin = getSupabaseAdmin()

    // Fetch channels from Slack via Nango proxy
    const nangoSecret = process.env.NANGO_SECRET_KEY
    const nangoBaseUrl = process.env.NANGO_BASE_URL || 'https://api.nango.dev'

    if (!nangoSecret) {
      return NextResponse.json({ error: 'NANGO_SECRET_KEY not configured' }, { status: 500 })
    }

    // Get list of channels (limit to 5 for testing)
    const channelsUrl = `${nangoBaseUrl}/proxy/conversations.list?limit=5`
    const channelsResponse = await fetch(channelsUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${nangoSecret}`,
        'Provider-Config-Key': providerConfigKey || 'slack',
        'Connection-Id': connectionId,
        'Content-Type': 'application/json'
      }
    })

    if (!channelsResponse.ok) {
      const errorText = await channelsResponse.text()
      console.error('Failed to fetch channels:', errorText)
      return NextResponse.json({ error: 'Failed to fetch channels from Slack' }, { status: 500 })
    }

    const channelsData = await channelsResponse.json()
    const channels = channelsData.channels || []

    console.log(`Found ${channels.length} channels for connection ${connectionId}`)

    // Fetch messages from each channel
    const allMessages = []
    
    for (const channel of channels) {
      try {
        // Get recent messages from this channel (limit to 10 for testing)
        const messagesUrl = `${nangoBaseUrl}/proxy/conversations.history?channel=${encodeURIComponent(channel.id)}&limit=10`
        const messagesResponse = await fetch(messagesUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${nangoSecret}`,
            'Provider-Config-Key': providerConfigKey || 'slack',
            'Connection-Id': connectionId,
            'Content-Type': 'application/json'
          }
        })

        if (!messagesResponse.ok) {
          console.error(`Failed to fetch messages from channel ${channel.id}:`, await messagesResponse.text())
          continue
        }

        const messagesData = await messagesResponse.json()
        const messages = messagesData.messages || []

        // Transform messages for our database
        const transformedMessages = messages.map((msg: any) => ({
          user_id: userId,
          connection_id: connectionId,
          channel_id: channel.id,
          slack_ts: msg.ts,
          text: msg.text,
          raw: msg
        }))

        allMessages.push(...transformedMessages)
        console.log(`Fetched ${messages.length} messages from channel ${channel.name || channel.id}`)
      } catch (error) {
        console.error(`Error fetching messages from channel ${channel.id}:`, error)
        continue
      }
    }

    // Insert messages into database (with conflict resolution)
    if (allMessages.length > 0) {
      const { error: insertError } = await supabaseAdmin
        .from('slack_messages')
        .upsert(allMessages, { 
          onConflict: 'connection_id,slack_ts',
          ignoreDuplicates: false
        })

      if (insertError) {
        console.error('Error inserting messages:', insertError)
        return NextResponse.json({ error: insertError.message }, { status: 500 })
      }

      console.log(`Successfully stored ${allMessages.length} messages for user ${userId}`)
    }

    return NextResponse.json({ 
      success: true, 
      messageCount: allMessages.length,
      channelCount: channels.length 
    })
  } catch (err: any) {
    console.error('Error fetching Slack messages:', err)
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 })
  }
}
