import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Nango } from '@nangohq/node'

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

    const nangoSecret = process.env.NANGO_SECRET_KEY
    const providerConfigKey = process.env.NANGO_PROVIDER_CONFIG_KEY || 'slack'
    if (!nangoSecret) {
      return NextResponse.json({ error: 'Server misconfigured: NANGO_SECRET_KEY missing' }, { status: 500 })
    }

    const nango = new Nango({ secretKey: nangoSecret })

    const response = await nango.createConnectSession({
      end_user: {
        id: user.id,
        email: user.email || undefined,
        display_name: (user.user_metadata?.full_name as string) || undefined,
      },
      allowed_integrations: [providerConfigKey],
    })

    return NextResponse.json({ token: response.data.token })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 })
  }
}


