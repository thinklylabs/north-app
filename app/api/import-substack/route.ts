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

    const body = await req.json().catch(() => ({})) as { urls?: string[] }
    const urls = Array.isArray(body?.urls) ? body.urls : []
    if (urls.length === 0) {
      return NextResponse.json({ error: 'No valid URLs provided' }, { status: 400 })
    }

    const imported: string[] = []

    for (const rawUrl of urls) {
      const cleaned = typeof rawUrl === 'string' ? rawUrl.trim() : ''
      if (!/^https?:\/\/[a-z0-9-]+\.substack\.com(\/.*)?$/i.test(cleaned)) {
        continue
      }

      const base = cleaned.replace(/\/$/, '')
      const feedUrl = `${base}/feed`

      try {
        const response = await fetch(feedUrl, { cache: 'no-store' })
        if (!response.ok) {
          continue
        }
        const rawContent = await response.text()

        const { error: insertErr } = await supabaseAdmin
          .from('substack_feeds')
          .insert({
            user_id: user.id,
            url: cleaned,
            raw_content: rawContent,
          })

        if (insertErr) {
          // Skip duplicates or other row-level errors and continue
          continue
        }
        imported.push(cleaned)
        // Tiny delay to be polite if many URLs
        await new Promise((r) => setTimeout(r, 150))
      } catch {
        // skip this URL
        continue
      }
    }

    if (imported.length === 0) {
      return NextResponse.json({ error: 'No feeds imported successfully' }, { status: 500 })
    }

    return NextResponse.json({ message: `${imported.length} Substack feeds imported successfully!` })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 })
  }
}


