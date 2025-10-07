import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { parseRssXmlToText } from '@/lib/rss'

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
    const results: Array<{ url: string; ok: boolean; message?: string; inserted?: number }> = []

    for (const rawUrl of urls) {
      const cleaned = typeof rawUrl === 'string' ? rawUrl.trim() : ''
      if (!/^https?:\/\/[a-z0-9-]+\.substack\.com(\/.*)?$/i.test(cleaned)) {
        continue
      }

      const base = cleaned.replace(/\/$/, '')
      const feedUrl = `${base}/feed`

      try {
        // Fetch XML manually with a standard UA; then parse
        const res = await fetch(feedUrl, {
          cache: 'no-store',
          headers: {
            'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119 Safari/537.36',
            'accept': 'application/rss+xml, application/xml;q=0.9, */*;q=0.8'
          }
        })
        if (!res.ok) {
          const body = await res.text().catch(() => '')
          const msg = `fetch ${res.status} ${res.statusText}`
          console.error('Failed to fetch Substack feed', feedUrl, msg, body?.slice(0, 500))
          results.push({ url: cleaned, ok: false, message: msg })
          continue
        }
        const xml = await res.text()
        let items
        try {
          items = await parseRssXmlToText(xml)
        } catch (e: any) {
          const msg = `parse error: ${e?.message || 'unknown'}`
          console.error('RSS parse error', feedUrl, msg)
          results.push({ url: cleaned, ok: false, message: msg })
          continue
        }

        // Ensure a content_source exists for this base Substack URL
        const sourceType = 'substack_feeds'
        const sourceName = base

        const { data: existingSource } = await supabaseAdmin
          .from('content_sources')
          .select('id')
          .eq('user_id', user.id)
          .eq('source_type', sourceType)
          .eq('source_name', sourceName)
          .maybeSingle()

        let sourceId = existingSource?.id as number | undefined
        if (!sourceId) {
          const { data: newSource, error: sourceInsertError } = await supabaseAdmin
            .from('content_sources')
            .insert({
              user_id: user.id,
              source_type: sourceType,
              source_name: sourceName,
              config: {}
            })
            .select('id')
            .single()

          if (sourceInsertError) {
            continue
          }
          sourceId = newSource.id
        }

        // Build one clean-text blob for the whole feed (same storage shape as before)
        const feedText = (items || []).map((it: any) => {
          const headerParts = [it.title].filter(Boolean)
          const header = headerParts.join('')
          const dateLine = it.pubDate ? `\n${new Date(it.pubDate).toUTCString()}` : ''
          const linkLine = it.link ? `\n${it.link}` : ''
          const body = it.text || ''
          return `${header}${dateLine}${linkLine}\n\n${body}`.trim()
        }).filter(Boolean).join(`\n\n------------------------------\n\n`)

        if (!feedText || !feedText.trim()) {
          results.push({ url: cleaned, ok: false, message: 'no items with text content' })
          continue
        }

        // Insert single raw_content row, preserving previous title and metadata shape
        const { data: insertedRaw, error: rawInsertError } = await supabaseAdmin
          .from('raw_content')
          .insert({
            source_id: sourceId,
            title: 'Substack feed',
            content: feedText,
            metadata: { url: cleaned }
          })
          .select('id')
          .single()

        if (rawInsertError) {
          console.error('raw_content insert error', rawInsertError)
          results.push({ url: cleaned, ok: false, message: `db insert error: ${rawInsertError.message}` })
          continue
        }

        // Immediately process into document_sections
        try {
          const { processRawDocument } = await import('@/lib/processRaw')
          await processRawDocument(insertedRaw.id)
        } catch (e) {
          console.error('Failed to process substack raw document', e)
        }

        imported.push(cleaned)
        results.push({ url: cleaned, ok: true, inserted: 1 })
        await new Promise((r) => setTimeout(r, 150))
      } catch (e: any) {
        const msg = e?.message || 'unexpected error'
        console.error('Unhandled Substack import error', feedUrl, msg)
        results.push({ url: cleaned, ok: false, message: msg })
        continue
      }
    }

    if (imported.length === 0) {
      return NextResponse.json({ error: 'No feeds imported successfully', results }, { status: 500 })
    }

    return NextResponse.json({ message: `${imported.length} Substack feeds imported successfully!`, results })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 })
  }
}


