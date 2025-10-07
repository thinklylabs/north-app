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
    
    console.log('Nango webhook received:', JSON.stringify(body, null, 2))
    
    // Handle different webhook event types
    if (body.type === "auth" && body.operation === "creation" && body.success) {
      const connectionId = body.connectionId as string
      const endUser = body.endUser
      const userId = endUser?.endUserId as string
      const providerConfigKey = body.providerConfigKey || 'slack'

      console.log(`Processing connection creation: userId=${userId}, connectionId=${connectionId}, provider=${providerConfigKey}`)

      if (!connectionId || !userId) {
        console.error('Missing required fields:', { connectionId, userId })
        return NextResponse.json({ error: 'Missing connectionId or userId' }, { status: 400 })
      }

      const supabaseAdmin = getSupabaseAdmin()

      // Save to nango_connections table
      const { error: upsertErr } = await supabaseAdmin
        .from('nango_connections')
        .upsert({
          user_id: userId,
          provider_config_key: providerConfigKey,
          connection_id: connectionId,
        }, { onConflict: 'user_id,provider_config_key' })

      if (upsertErr) {
        console.error('Error saving connection:', upsertErr)
        return NextResponse.json({ error: upsertErr.message }, { status: 500 })
      }

      console.log('Connection saved successfully')

      // Trigger fetching for Slack/Notion connections
      if (providerConfigKey === 'slack') {
        try {
          console.log('Triggering Slack message fetch...')
          // Call our internal API to fetch and store messages
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
          const response = await fetch(`${baseUrl}/api/slack/fetch-messages`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId,
              connectionId,
              providerConfigKey
            })
          })

          if (!response.ok) {
            const errorText = await response.text()
            console.error('Failed to fetch Slack messages:', errorText)
          } else {
            const result = await response.json()
            console.log('Message fetch result:', result)
          }
        } catch (error) {
          console.error('Error triggering message fetch:', error)
          // Don't fail the webhook if message fetching fails
        }
      } else if (providerConfigKey === 'notion') {
        try {
          console.log('Triggering Notion import...')
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
          await fetch(`${baseUrl}/api/notion/import`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, connectionId, providerConfigKey })
          })
        } catch (error) {
          console.error('Error triggering Notion import:', error)
        }
      }

      return NextResponse.json({ success: true })
    }

    // Handle other event types if needed
    console.log('Webhook event ignored:', body.type, body.operation)
    return NextResponse.json({ ignored: true })
  } catch (err: any) {
    console.error('Webhook error:', err)
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 })
  }
}
