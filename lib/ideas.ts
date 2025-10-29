import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js'

type ExtractedIdea = {
  idea_topic: string
  idea_summary: string
  idea_eq?: string
  idea_takeaway?: string
}

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error('Missing Supabase admin environment variables')
  }
  return createSupabaseAdminClient(url, serviceKey)
}

function normalizeSignature(text: string): string {
  const lower = (text || '').toLowerCase()
  const collapsed = lower.replace(/\s+/g, ' ').trim()
  const stripped = collapsed.replace(/[^a-z0-9\s|]/g, '')
  return stripped
}

async function computeDedupeSignature(topic: string, takeaway: string): Promise<string> {
  const base = `${topic || ''}|${takeaway || ''}`
  const normalized = normalizeSignature(base)
  const { createHash } = await import('crypto')
  return createHash('sha256').update(normalized).digest('hex')
}

function buildPromptV2(sourceType: string, title: string | null, content: string): { system: string; user: string } {
  const system = `You are the "Post Idea Generator (builder tone, real talk)".
Your job: turn any transcript, meeting note, substack, or raw dump into 3–4 high-signal LinkedIn post ideas that have story, tension, and critique — ready for downstream hook → draft → final post agents.

Follow these exact requirements:
- Read the input end-to-end (no keyword skimming)
- Identify the sharpest tensions, surprises, or contradictions (what most people assume vs what actually happened)
- Anchor each idea in real context — feedback, anecdote, data, or observed pain point
- Output must cover multiple idea_buckets: at least one contrarian, one story (build-in-public or founder/personal), and one tactical/playbook angle
- For each idea: define
  - hook_angle (opening question or energy)
  - value_prop (why it matters)
  - emotional_driver (emotion felt — frustration, relief, pride, disbelief, curiosity)
  - content_core (3–5 sentences of real context or learning)
  - forward_guidance (what hook agent should emphasize)
  - critique_note (what to avoid to sound real)
  - person_reference (optional, 1 of 3–4 ideas)
- Each idea unique in pacing and tone
- Finish with batch_summary (1 line insight about the founder, market, or trend)
- Tone: builder, reflective, lowercase, punchy. Avoid generic filler.
- Output exactly 3–4 ideas.

Output strict JSON array matching this schema:
[
  {
    "topic": "string",
    "summary": "string",
    "eq": "string",
    "takeaway": "string",
    "bucket": "string"
  }
]
No prose outside JSON.`

  const header = `[source_type: ${sourceType}]${title ? `\n[title: ${title}]` : ''}`
  const user = `Context:\n${header}\n\nContent:\n${content.slice(0, 20000)}`
  return { system, user }
}

async function callOpenAIExtractV2(system: string, user: string): Promise<ExtractedIdea[]> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set')
  }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.4,
    }),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`OpenAI error ${res.status}: ${errText}`)
  }

  const json = await res.json()
  const content = json?.choices?.[0]?.message?.content
  console.log('🧩 Raw OpenAI content:', content)

  let parsed: any
  try {
    parsed = JSON.parse(content)
  } catch {
    console.error('Failed to parse OpenAI response.')
    return []
  }

  const ideasArray = Array.isArray(parsed) ? parsed : parsed.ideas
  if (!Array.isArray(ideasArray)) return []

  const ideas: ExtractedIdea[] = ideasArray.map((i) => ({
    idea_topic: i.topic,
    idea_summary: i.summary,
    idea_eq: i.eq,
    idea_takeaway: i.takeaway,
  })).filter(i => i.idea_topic && i.idea_summary)

  return ideas
}

async function callOpenAIExtract(system: string, user: string): Promise<ExtractedIdea | null> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set')
  }
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' },
    }),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`OpenAI error ${res.status}: ${errText}`)
  }
  const json = await res.json()
  const content: string | undefined = json?.choices?.[0]?.message?.content
  if (!content) return null
  try {
    const parsed = JSON.parse(content)
    const idea: ExtractedIdea = {
      idea_topic: String(parsed?.idea_topic || '').slice(0, 300),
      idea_summary: String(parsed?.idea_summary || '').slice(0, 2000),
      idea_eq: parsed?.idea_eq ? String(parsed.idea_eq).slice(0, 400) : undefined,
      idea_takeaway: parsed?.idea_takeaway ? String(parsed.idea_takeaway).slice(0, 600) : undefined,
    }
    if (!idea.idea_topic || !idea.idea_summary) return null
    return idea
  } catch {
    return null
  }
}

export async function generateIdeaForRawId(rawId: number, isFromCron?: boolean): Promise<{ inserted: boolean; ideaIds?: number[]; skippedDuplicates?: number }> {
  const supabase = getAdminClient()

  const { data: raw, error: rawErr } = await supabase
    .from('raw_content')
    .select('id, source_id, title, content, created_at')
    .eq('id', rawId)
    .maybeSingle()
  if (rawErr) throw rawErr
  if (!raw) throw new Error('raw_content not found')

  const { data: source, error: srcErr } = await supabase
    .from('content_sources')
    .select('id, user_id, source_type')
    .eq('id', raw.source_id)
    .maybeSingle()
  if (srcErr) throw srcErr
  if (!source) throw new Error('content_source not found')

  const { system, user } = buildPromptV2(String(source.source_type || ''), raw.title || null, String(raw.content || ''))

  let ideas: ExtractedIdea[] = []
  try {
    ideas = await callOpenAIExtractV2(system, user)
  } catch (e) {
    console.error('OpenAI extract failed', e)
    return { inserted: false }
  }

  if (!ideas.length) {
    console.error('⚠️ No ideas extracted — parser returned empty array.')
    return { inserted: false }
  }

  const results: any[] = []
  const insertedIds: number[] = []
  let skippedCount = 0

  for (const idea of ideas) {
    const signature = await computeDedupeSignature(idea.idea_topic, idea.idea_takeaway || '')

    const { data: existing } = await supabase
      .from('ideas')
      .select('id')
      .eq('user_id', source.user_id)
      .eq('dedupe_signature', signature)
      .is('deleted_at', null)
      .maybeSingle()

    if (existing) {
      results.push({ skippedDuplicate: true })
      skippedCount++
      continue
    }

    const insertRow = {
      user_id: source.user_id,
      source_id: source.id,
      raw_id: raw.id,
      source_type: source.source_type,
      idea_topic: idea.idea_topic,
      idea_summary: idea.idea_summary,
      idea_eq: idea.idea_eq || null,
      idea_takeaway: idea.idea_takeaway || null,
      dedupe_signature: signature,
    }

    console.log('🧠 Inserting idea:', insertRow)
    const { data: inserted, error: insErr } = await supabase
      .from('ideas')
      .insert(insertRow)
      .select('id')
      .single()

    if (insErr) {
      console.error('❌ Supabase insert error:', insErr)
      continue
    }

    results.push({ inserted: true, ideaId: inserted?.id })
    if (inserted?.id) {
      insertedIds.push(inserted.id)
    }

    try {
      const { generateInsightForIdeaId } = await import('@/lib/insights')
      if (inserted?.id) {
        await generateInsightForIdeaId(inserted.id)
        const { runHookAndPostPipelineForIdea } = await import('@/lib/pipeline')
        await runHookAndPostPipelineForIdea(inserted.id, isFromCron)
      }
    } catch (e) {
      console.error('Failed downstream pipeline for idea', inserted?.id, e)
    }
  }

  return { 
    inserted: insertedIds.length > 0, 
    ideaIds: insertedIds,
    skippedDuplicates: skippedCount
  }
}


