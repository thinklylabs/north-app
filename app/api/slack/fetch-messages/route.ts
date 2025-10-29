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

    // Get list of channels (no artificial limits)
    const channelsUrl = `${nangoBaseUrl}/proxy/conversations.list`
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

    // Prepare raw_content rows
    const rawContentRows: any[] = []
    
    for (const channel of channels) {
      try {
        // Get messages from this channel (no artificial limits; rely on API pagination defaults)
        const messagesUrl = `${nangoBaseUrl}/proxy/conversations.history?channel=${encodeURIComponent(channel.id)}`
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

        // Ensure content_source exists per channel
        const sourceType = 'slack_messages'
        const sourceName = channel.id

        const { data: existingSource } = await supabaseAdmin
          .from('content_sources')
          .select('id')
          .eq('user_id', userId)
          .eq('source_type', sourceType)
          .eq('source_name', sourceName)
          .maybeSingle()

        let sourceId = existingSource?.id as number | undefined
        if (!sourceId) {
          const { data: newSource, error: sourceInsertError } = await supabaseAdmin
            .from('content_sources')
            .insert({
              user_id: userId,
              source_type: sourceType,
              source_name: sourceName,
              config: { connection_id: connectionId, channel_name: channel.name }
            })
            .select('id')
            .single()
          if (sourceInsertError) {
            console.error('Failed to create content_source for channel', channel.id, sourceInsertError)
            continue
          }
          sourceId = newSource.id
        }

        // Transform into raw_content rows
        for (const msg of messages) {
          const title = 'slack'
          rawContentRows.push({
            source_id: sourceId,
            title,
            content: msg?.text || '',
            metadata: {
              provider: 'slack',
              connection_id: connectionId,
              channel_id: channel.id,
              channel_name: channel.name,
              slack_ts: msg?.ts,
              raw: msg
            }
          })
        }

        console.log(`Prepared ${messages.length} raw_content rows from channel ${channel.name || channel.id}`)
      } catch (error) {
        console.error(`Error fetching messages from channel ${channel.id}:`, error)
        continue
      }
    }

    // Insert raw_content rows
    if (rawContentRows.length > 0) {
      const { data: inserted, error: insertError } = await supabaseAdmin
        .from('raw_content')
        .insert(rawContentRows)
        .select('id')

      if (insertError) {
        console.error('Error inserting raw_content:', insertError)
        return NextResponse.json({ error: insertError.message }, { status: 500 })
      }

      // Process inserted rows into document_sections
      try {
        const { processRawDocument } = await import('@/lib/processRaw')
        for (const row of inserted || []) {
          await processRawDocument(row.id)
        }
      } catch (e) {
        console.error('Failed to process some Slack raw documents', e)
      }

      // Generate ideas for inserted rows (best-effort)
      try {
        const { generateIdeaForRawId } = await import('@/lib/ideas')
        for (const row of inserted || []) {
          await generateIdeaForRawId(row.id, true)
        }
      } catch (e) {
        console.error('Failed to generate ideas for some Slack raw documents', e)
      }

      console.log(`Successfully stored ${rawContentRows.length} raw_content rows for user ${userId}`)
    }

    return NextResponse.json({ 
      success: true, 
      messageCount: rawContentRows.length,
      channelCount: channels.length 
    })
  } catch (err: any) {
    console.error('Error fetching Slack messages:', err)
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 })
  }
}
