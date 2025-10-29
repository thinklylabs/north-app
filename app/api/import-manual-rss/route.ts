import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { extractWebsiteContentWithFallback } from '@/lib/tavily'

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

    async function handleUrl(rawUrl: string) {
      const cleaned = typeof rawUrl === 'string' ? rawUrl.trim() : ''
      if (!/^https?:\/\/.+/.test(cleaned)) {
        return { url: cleaned || rawUrl, ok: false, message: 'invalid url format' }
      }

      try {
        // Extract content using Tavily
        const { content, formatUsed } = await extractWebsiteContentWithFallback(cleaned)
        
        if (!content || content.trim().length < 100) {
          return { url: cleaned, ok: false, message: 'insufficient content extracted' }
        }

        // Create or get content source
        const sourceType = 'manual_rss'
        const sourceName = cleaned  // Use full URL to differentiate between different blogs on same domain
        
        const { data: existingSource } = await supabaseAdmin
          .from('content_sources')
          .select('id')
          .eq('user_id', user!.id)
          .eq('source_type', sourceType)
          .eq('source_name', sourceName)
          .maybeSingle()

        let sourceId = existingSource?.id as number | undefined
        if (!sourceId) {
          const { data: newSource, error: sourceInsertError } = await supabaseAdmin
            .from('content_sources')
            .insert({ 
              user_id: user!.id, 
              source_type: sourceType, 
              source_name: sourceName, 
              config: { format_used: formatUsed } 
            })
            .select('id')
            .single()
          if (sourceInsertError) {
            return { url: cleaned, ok: false, message: `db source error: ${sourceInsertError.message}` }
          }
          sourceId = newSource.id
        }

        // Check for recent content to avoid duplicates
        const { data: recentContent } = await supabaseAdmin
          .from('raw_content')
          .select('created_at')
          .eq('source_id', sourceId)
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .order('created_at', { ascending: false })
          .limit(1)

        if (recentContent && recentContent.length > 0) {
          return { url: cleaned, ok: true, message: 'Content already imported recently', inserted: 0 }
        }

        // Insert raw content
        const { data: insertedRaw, error: rawInsertError } = await supabaseAdmin
          .from('raw_content')
          .insert({ 
            source_id: sourceId, 
            title: `Manual RSS: ${new URL(cleaned).hostname}`, 
            content: content, 
            metadata: { url: cleaned, format_used: formatUsed } 
          })
          .select('id')
          .single()

        if (rawInsertError) {
          console.error('raw_content insert error', rawInsertError)
          return { url: cleaned, ok: false, message: `db insert error: ${rawInsertError.message}` }
        }

        // Process content asynchronously
        ;(async () => {
          try {
            const { processRawDocument } = await import('@/lib/processRaw')
            await processRawDocument(insertedRaw.id)
          } catch (e) {
            console.error('Failed to process manual RSS raw document', e)
          }
          try {
            const { generateIdeaForRawId } = await import('@/lib/ideas')
            await generateIdeaForRawId(insertedRaw.id, true)
          } catch (e) {
            console.error('Failed to generate idea for manual RSS raw document', e)
          }
        })().catch(() => {})

        imported.push(cleaned)
        return { url: cleaned, ok: true, inserted: 1 }
      } catch (e: any) {
        const msg = e?.message || 'unexpected error'
        console.error('Unhandled manual RSS import error', cleaned, msg)
        return { url: cleaned, ok: false, message: msg }
      }
    }

    const settled = await Promise.allSettled(urls.map(handleUrl))
    for (const r of settled) {
      if (r.status === 'fulfilled') {
        results.push(r.value)
      } else {
        results.push({ url: '', ok: false, message: r.reason?.message || 'unhandled error' })
      }
    }

    if (imported.length === 0) {
      return NextResponse.json({ error: 'No URLs imported successfully', results }, { status: 500 })
    }

    return NextResponse.json({ message: `${imported.length} URLs imported successfully!`, results })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 })
  }
}
