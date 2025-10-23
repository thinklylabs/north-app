import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js'
import { chunkBySourceType } from './chunking'
import { generateEmbedding } from './embeddings'

export async function processRawDocument(rawId: number): Promise<{ sectionsCreated: number }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error('Missing Supabase admin environment variables')
  }
  const supabase = createSupabaseAdminClient(url, serviceKey)

  // 1) Load raw_content row and join source type
  const { data: raw, error: rawErr } = await supabase
    .from('raw_content')
    .select('id, content, metadata, source_id, created_at')
    .eq('id', rawId)
    .maybeSingle()

  if (rawErr) throw rawErr
  if (!raw) throw new Error('Raw document not found')

  const { data: source, error: srcErr } = await supabase
    .from('content_sources')
    .select('id, source_type, source_name, user_id, config')
    .eq('id', raw.source_id)
    .maybeSingle()

  if (srcErr) throw srcErr
  if (!source) throw new Error('Content source not found for raw document')

  const sourceType = source.source_type as 'thoughts' | 'slack_messages' | 'substack_feeds' | 'files' | 'notion' | 'manual_rss'

  // 2) Chunk
  const chunks = chunkBySourceType(raw.content, sourceType, raw.metadata || {})
  if (chunks.length === 0) {
    // Mark processed even if empty
    await supabase.from('raw_content').update({ processed_at: new Date().toISOString() }).eq('id', raw.id)
    return { sectionsCreated: 0 }
  }

  // 3) Embed and insert sections (sequential with small parallelism could be added later)
  let created = 0
  for (const chunk of chunks) {
    const embedding = await generateEmbedding(chunk.content)
    const { error: insErr } = await supabase
      .from('document_sections')
      .insert({
        document_id: raw.id,
        content: chunk.content,
        section_type: sourceType,
        metadata: chunk.metadata,
        embedding,
      })
    if (insErr) throw insErr
    created += 1
  }

  // 4) Mark processed
  await supabase
    .from('raw_content')
    .update({ processed_at: new Date().toISOString() })
    .eq('id', raw.id)

  return { sectionsCreated: created }
}


