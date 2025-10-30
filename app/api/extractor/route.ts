import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import { runExtractorForLongform } from '@/lib/extractorAgent'
import { generateIdeaForRawId } from '@/lib/ideas'

function getSupabaseForUser(accessToken: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')
  if (!anonKey) throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY')
  return createClient(url, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  })
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const accessToken = authHeader.replace('Bearer ', '')
    const supabase = getSupabaseForUser(accessToken)

    const { data: { user }, error: userErr } = await supabase.auth.getUser()
    if (userErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({})) as {
      source_type: 'slack_messages' | 'substack_feeds' | 'files' | 'notion' | 'manual_rss'
      title?: string | null
      content?: string
      icp_profile?: string
      trigger_ideas?: boolean
    }

    const sourceType = body?.source_type
    const content = (body?.content || '').trim()
    const icp = (body?.icp_profile || '').trim()
    const title = body?.title ?? null

    if (!sourceType || !content || !icp) {
      return NextResponse.json({ error: 'Missing source_type, content, or icp_profile' }, { status: 400 })
    }

    console.log('[api/extractor] Incoming request', {
      userId: user.id,
      sourceType,
      title: title || null,
      contentChars: content.length,
    })

    // 1) Run extractor (long-form guard inside)
    const extractor = await runExtractorForLongform({
      source_type: sourceType,
      title,
      content,
      icp_profile: icp,
    })

    console.log('[api/extractor] Extractor themes:', extractor.themes.length)

    let ideasRun: any = null

    // 2) Optional: persist & trigger ideas pipeline
    if (body?.trigger_ideas) {
      const admin = createAdminClient()
      console.log('[api/extractor] trigger_ideas enabled → ensuring content_source')

      const { data: existing } = await admin
        .from('content_sources')
        .select('id')
        .eq('user_id', user.id)
        .eq('source_type', sourceType)
        .limit(1)
        .maybeSingle()

      let sourceId = existing?.id as number | undefined
      if (!sourceId) {
        const { data: ins, error: srcErr } = await admin
          .from('content_sources')
          .insert({
            user_id: user.id,
            source_type: sourceType,
            source_name: title || `${sourceType}-${Date.now()}`,
            config: {},
          })
          .select('id')
          .single()
        if (srcErr) return NextResponse.json({ error: srcErr.message }, { status: 400 })
        sourceId = ins.id
        console.log('[api/extractor] Created content_source', { sourceId })
      }

      const { data: raw, error: rawErr } = await admin
        .from('raw_content')
        .insert({
          source_id: sourceId,
          title: extractor.title,
          content: extractor.cleaned_content,
        })
        .select('id')
        .single()
      if (rawErr) return NextResponse.json({ error: rawErr.message }, { status: 400 })
      console.log('[api/extractor] Inserted raw_content', { rawId: raw.id })

      ideasRun = await generateIdeaForRawId(raw.id)
      console.log('[api/extractor] Ideas generation result', ideasRun)
    }

    return NextResponse.json({
      extractor: {
        source_type: extractor.source_type,
        title: extractor.title,
        themes: extractor.themes,
        guided_context_for_ideas: extractor.guided_context_for_ideas,
      },
      ideas: ideasRun,
    })
  } catch (err: any) {
    console.error('[api/extractor] Error', err?.message)
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 })
  }
}


