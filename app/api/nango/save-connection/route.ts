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
    const supabaseAdmin = getSupabaseAdmin()

    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const accessToken = authHeader.replace('Bearer ', '')

    const { data: { user }, error: userErr } = await supabaseAdmin.auth.getUser(accessToken)
    if (userErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({})) as { connectionId?: string, providerConfigKey?: string }
    const connectionId = body?.connectionId?.trim()
    const providerConfigKey = body?.providerConfigKey?.trim() || 'slack'
    if (!connectionId) {
      return NextResponse.json({ error: 'Missing connectionId' }, { status: 400 })
    }

    // Store in a table mapping users to provider connections
    // Table suggestion: nango_connections(user_id uuid, provider_config_key text, connection_id text, created_at timestamptz)
    const { error: upsertErr } = await supabaseAdmin
      .from('nango_connections')
      .upsert({
        user_id: user.id,
        provider_config_key: providerConfigKey,
        connection_id: connectionId,
      }, { onConflict: 'user_id,provider_config_key' })

    if (upsertErr) {
      return NextResponse.json({ error: upsertErr.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 })
  }
}


