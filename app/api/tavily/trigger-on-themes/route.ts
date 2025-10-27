import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) throw new Error('Missing Supabase env')
  return createSupabaseAdminClient(url, serviceKey)
}

export async function POST(req: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const body = await req.json().catch(() => ({})) as { user_id: string }

    if (!body.user_id) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 })
    }

    console.log(`Triggering Tavily search for user: ${body.user_id}`)

    // Get user's themes
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('themes')
      .eq('id', body.user_id)
      .single()

    if (profileError) {
      console.error('Error fetching user profile:', profileError)
      return NextResponse.json({ error: 'Failed to fetch user profile' }, { status: 500 })
    }

    if (!profile?.themes || profile.themes.length === 0) {
      return NextResponse.json({ error: 'No themes found for user' }, { status: 400 })
    }

    console.log(`User themes: ${profile.themes.join(', ')}`)

    // Trigger Tavily search immediately
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const searchResponse = await fetch(`${baseUrl}/api/tavily/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: body.user_id,
        themes: profile.themes,
        force: true
      })
    })

    const searchResult = await searchResponse.json()

    if (!searchResponse.ok) {
      console.error('Tavily search failed:', searchResult)
      return NextResponse.json({ error: searchResult.error }, { status: 500 })
    }

    console.log(`Tavily search completed successfully for user ${body.user_id}`)

    return NextResponse.json({
      success: true,
      message: 'Tavily search triggered successfully',
      search_result: searchResult
    })

  } catch (error: any) {
    console.error('Error triggering Tavily search:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
