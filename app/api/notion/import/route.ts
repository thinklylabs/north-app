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

const NOTION_VERSION = '2022-06-28'

export async function POST(req: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin()

    const nangoSecret = process.env.NANGO_SECRET_KEY
    const nangoBaseUrl = process.env.NANGO_BASE_URL || 'https://api.nango.dev'
    if (!nangoSecret) {
      return NextResponse.json({ error: 'NANGO_SECRET_KEY not configured' }, { status: 500 })
    }

    const body = await req.json().catch(() => ({})) as {
      userId?: string
      connectionId?: string
      providerConfigKey?: string
    }

    const userId = body?.userId?.trim()
    const connectionId = body?.connectionId?.trim()
    const providerConfigKey = (body?.providerConfigKey || 'notion').trim()

    if (!userId || !connectionId) {
      return NextResponse.json({ error: 'Missing userId or connectionId' }, { status: 400 })
    }

    const nango = new Nango({ secretKey: nangoSecret })

    async function nangoNotion(path: string, init: RequestInit & { jsonBody?: any } = {}) {
      const { jsonBody, ...rest } = init
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${nangoSecret}`,
        'Provider-Config-Key': providerConfigKey,
        'Connection-Id': connectionId!,
        'Content-Type': 'application/json',
        'Notion-Version': NOTION_VERSION,
      }
      const res = await fetch(`${nangoBaseUrl}/proxy${path}`, {
        ...rest,
        headers,
        body: jsonBody !== undefined ? JSON.stringify(jsonBody) : rest.body,
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(`Notion proxy ${path} ${res.status}: ${text}`)
      }
      return res.json()
    }

    // Prefer using the ContentMetadata sync if available to enumerate pages
    let pageIds: Set<string> = new Set()
    try {
      let cursor: string | undefined
      do {
        const { records, next_cursor }: any = await nango.listRecords({
          providerConfigKey,
          connectionId: connectionId!,
          model: 'ContentMetadata',
          cursor,
          limit: 100,
        })
        for (const r of records || []) {
          if (r?.type === 'page' && r?.id) pageIds.add(r.id)
        }
        cursor = next_cursor || undefined
      } while (cursor)
    } catch {
      // ignore and fallback below
    }

    // Fallback to Notion search if no pages discovered via sync
    if (pageIds.size === 0) {
      const search = await nangoNotion('/v1/search', { method: 'POST', jsonBody: { page_size: 100 } })
      const results = Array.isArray(search?.results) ? search.results : []
      for (const r of results) {
        if (r?.object === 'page' && r?.id) pageIds.add(r.id)
      }
    }

    // Helper to read page title
    function getPageTitle(p: any): string {
      const props = p?.properties || {}
      for (const key of Object.keys(props)) {
        const prop = props[key]
        if (prop?.type === 'title') {
          const t = (prop.title || []).map((rt: any) => rt?.plain_text || '').join('').trim()
          if (t) return t
        }
      }
      return 'Untitled'
    }

    async function getBlocksText(blockId: string, depth = 0): Promise<string> {
      if (depth > 5) return ''
      let out: string[] = []
      let start = ''
      let hasMore = true
      while (hasMore) {
        const url = start ? `/v1/blocks/${blockId}/children?start_cursor=${encodeURIComponent(start)}` : `/v1/blocks/${blockId}/children`
        const data = await nangoNotion(url, { method: 'GET' })
        const results = Array.isArray(data?.results) ? data.results : []
        for (const it of results) {
          const t = it?.type
          if (t && it?.[t]?.rich_text) {
            const text = (it[t].rich_text || []).map((rt: any) => rt?.plain_text || '').join('').trim()
            if (text) out.push(text)
          }
          if (it?.has_children && it?.id) {
            const child = await getBlocksText(it.id, depth + 1)
            if (child) out.push(child)
          }
        }
        hasMore = !!data?.has_more
        start = data?.next_cursor || ''
      }
      return out.join('\n').trim()
    }

    const sections: string[] = []
    for (const pageId of pageIds) {
      try {
        const page = await nangoNotion(`/v1/pages/${pageId}`, { method: 'GET' })
        const title = getPageTitle(page)
        const body = await getBlocksText(pageId)
        const combined = [title, body].filter(Boolean).join('\n\n').trim()
        if (combined) sections.push(combined)
      } catch {
        continue
      }
    }

    if (sections.length === 0) {
      return NextResponse.json({ error: 'No Notion content available (no pages found or pages had no text content)' }, { status: 404 })
    }

    const feedText = sections.join(`\n\n------------------------------\n\n`)

    // Ensure content_source
    const { data: existingSource } = await supabaseAdmin
      .from('content_sources')
      .select('id')
      .eq('user_id', userId)
      .eq('source_type', 'notion')
      .eq('source_name', 'workspace')
      .maybeSingle()

    let sourceId = existingSource?.id as number | undefined
    if (!sourceId) {
      const { data: newSource, error: sourceInsertError } = await supabaseAdmin
        .from('content_sources')
        .insert({
          user_id: userId,
          source_type: 'notion',
          source_name: 'workspace',
          config: { connection_id: connectionId },
        })
        .select('id')
        .single()
      if (sourceInsertError) {
        return NextResponse.json({ error: sourceInsertError.message }, { status: 500 })
      }
      sourceId = newSource.id
    }

    // Insert single raw_content row
    const { data: insertedRaw, error: rawInsertError } = await supabaseAdmin
      .from('raw_content')
      .insert({
        source_id: sourceId,
        title: 'Notion workspace',
        content: feedText,
        metadata: { provider: 'notion', connection_id: connectionId, workspace: 'default' },
      })
      .select('id')
      .single()

    if (rawInsertError) {
      return NextResponse.json({ error: rawInsertError.message }, { status: 500 })
    }

    // Process
    try {
      const { processRawDocument } = await import('@/lib/processRaw')
      await processRawDocument(insertedRaw.id)
    } catch {
      // ignore
    }

    // Generate idea (best-effort)
    try {
      const { generateIdeaForRawId } = await import('@/lib/ideas')
      await generateIdeaForRawId(insertedRaw.id, true)
    } catch (e) {
      console.error('Failed to generate idea for Notion raw document', e)
    }

    return NextResponse.json({ success: true, pages: sections.length, inserted: 1 })
  } catch (err: any) {
    console.error('Notion import error:', err)
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 })
  }
}


