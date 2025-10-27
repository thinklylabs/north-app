import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => null)
    const content: string | undefined = body?.content

    if (!content || typeof content !== 'string' || !content.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    // Find or create content source for user thoughts
    const sourceType = 'thoughts'
    const sourceName = 'user_thoughts'

    const { data: existingSource, error: sourceFetchError } = await supabase
      .from('content_sources')
      .select('id')
      .eq('user_id', user.id)
      .eq('source_type', sourceType)
      .eq('source_name', sourceName)
      .maybeSingle()

    if (sourceFetchError) {
      return NextResponse.json({ error: sourceFetchError.message }, { status: 500 })
    }

    let sourceId = existingSource?.id as number | undefined
    if (!sourceId) {
      const { data: newSource, error: insertSourceError } = await supabase
        .from('content_sources')
        .insert({
          user_id: user.id,
          source_type: sourceType,
          source_name: sourceName,
          config: {}
        })
        .select('id')
        .single()

      if (insertSourceError) {
        return NextResponse.json({ error: insertSourceError.message }, { status: 500 })
      }

      sourceId = newSource.id
    }

    // Insert the thought into raw_content
    const { data: rawContent, error: rawInsertError } = await supabase
      .from('raw_content')
      .insert({
        source_id: sourceId,
        title: 'Thought',
        content: content.trim(),
        metadata: {}
      })
      .select('*')
      .single()

    if (rawInsertError) {
      return NextResponse.json({ error: rawInsertError.message }, { status: 500 })
    }

    // Immediately process this raw document into document_sections
    try {
      const { processRawDocument } = await import('@/lib/processRaw')
      await processRawDocument(rawContent.id)
    } catch (err) {
      // Do not fail the request if processing fails; ingestion succeeded
      console.error('Failed to process raw thought document:', err)
    }

    // Generate idea for this raw document (non-blocking best-effort)
    try {
      const { generateIdeaForRawId } = await import('@/lib/ideas')
      await generateIdeaForRawId(rawContent.id)
    } catch (err) {
      console.error('Failed to generate idea for thought raw document:', err)
    }

    return NextResponse.json({ message: rawContent }, { status: 201 })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}


