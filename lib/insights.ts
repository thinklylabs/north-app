import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js'

type SingleInsight = {
  title: string
  explanation: string
  target_audience: string
  suggested_formats: string[]
  examples: string[]
  risks_or_pitfalls: string[]
  metrics_to_track: string[]
  timeframe: string
  idea_eq?: string
}

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error('Missing Supabase admin environment variables')
  }
  return createSupabaseAdminClient(url, serviceKey)
}

async function generateEmbedding(text: string) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set')
  }
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      input: text,
      model: 'text-embedding-3-small'
    })
  })
  if (!res.ok) {
    const err = await res.text().catch(() => '')
    throw new Error(`OpenAI embeddings error ${res.status}: ${err}`)
  }
  const json = await res.json()
  return json.data?.[0]?.embedding
}

async function fetchRagContextForTopic(userId: string, topic: string): Promise<string> {
  const supabase = getAdminClient()
  const embedding = await generateEmbedding(topic)

  let { data, error } = await supabase
    .rpc('match_document_sections', {
      query_embedding: embedding,
      match_threshold: 0.7,
      p_user_id: userId,
      limit_count: 5
    })
    .select('content, section_type')

  if (error) {
    throw error
  }

  if (!data || data.length === 0) {
    const wider = await supabase
      .rpc('match_document_sections', {
        query_embedding: embedding,
        match_threshold: -1000000,
        p_user_id: userId,
        limit_count: 5
      })
      .select('content, section_type')
    if (!wider.error && wider.data) {
      data = wider.data
    }
  }

  const contextText = (data || [])
    .map((c: any, i: number) => `(${i + 1}) [${c.section_type}] ${c.content}`)
    .join('\n')

  return String(contextText || '').slice(0, 12000)
}

function buildSystemPrompt(): string {
  return 'You are an elite content strategy and growth expert. Generate ONE high-quality, concise, actionable insight centered STRICTLY on the provided idea_topic. Use the optional context only to enrich specifics; do not drift off-topic. Be concrete, ICP-aware, and distribution-aware. Avoid fluff and clichés. Output STRICT JSON only.'
}

function buildUserPrompt(topic: string, context: string): string {
  return [
    `Idea topic: "${topic}"`,
    '',
    'Optional RAG context (use only if relevant; do not invent facts):',
    context,
    '',
    'Task:',
    '- Produce ONE consolidated insight that a creator/brand can execute within 1–2 weeks, strictly centered on the idea_topic.',
    '- Keep it crisp and outcome-oriented. Do NOT include hooks.',
    '- Also provide idea_eq as a VERY SHORT phrase (a few words) capturing the primary emotional angle for the audience (e.g., pride, relief, safety, momentum).',
    '',
    'Schema (return ONLY this JSON object):',
    '{',
    '  "title": "string (<= 90 chars)",',
    '  "explanation": "string (<= 500 chars)",',
    '  "target_audience": "string (<= 140 chars)",',
    '  "suggested_formats": ["string", "..."],',
    '  "examples": ["string", "..."],',
    '  "risks_or_pitfalls": ["string", "..."],',
    '  "metrics_to_track": ["string", "..."],',
    '  "timeframe": "string (<= 60 chars)",',
    '  "idea_eq": "string (<= 60 chars) — a few words only"',
    '}',
  ].join('\n')
}

async function callOpenAISingleInsight(topic: string, context: string): Promise<SingleInsight | null> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set')
  }
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: buildSystemPrompt() },
        { role: 'user', content: buildUserPrompt(topic, context) }
      ],
      temperature: 0.35,
      response_format: { type: 'json_object' }
    })
  })

  if (!res.ok) {
    const err = await res.text().catch(() => '')
    throw new Error(`OpenAI error ${res.status}: ${err}`)
  }
  const json = await res.json()
  const content: string | undefined = json?.choices?.[0]?.message?.content
  if (!content) return null

  try {
    const parsed = JSON.parse(content)
    const norm = (arr: any): string[] => Array.isArray(arr) ? arr.map((s: any) => String(s)).slice(0, 6) : []
    const insight: SingleInsight = {
      title: String(parsed?.title || '').slice(0, 200),
      explanation: String(parsed?.explanation || '').slice(0, 1000),
      target_audience: String(parsed?.target_audience || '').slice(0, 280),
      suggested_formats: norm(parsed?.suggested_formats),
      examples: norm(parsed?.examples),
      risks_or_pitfalls: norm(parsed?.risks_or_pitfalls),
      metrics_to_track: norm(parsed?.metrics_to_track),
      timeframe: String(parsed?.timeframe || '').slice(0, 120),
      idea_eq: parsed?.idea_eq ? String(parsed.idea_eq).slice(0, 120) : undefined
    }
    if (!insight.title && !insight.explanation) return null
    return insight
  } catch {
    return null
  }
}

export async function generateInsightForIdeaId(ideaId: number): Promise<{ inserted: boolean; insightId?: number }> {
  const supabase = getAdminClient()

  const { data: idea, error: ideaErr } = await supabase
    .from('ideas')
    .select('id, user_id, idea_topic')
    .eq('id', ideaId)
    .maybeSingle()
  if (ideaErr) throw ideaErr
  if (!idea) throw new Error('Idea not found')

  let context = ''
  try {
    context = await fetchRagContextForTopic(String(idea.user_id), String(idea.idea_topic || ''))
  } catch (e) {
    // Best-effort: proceed without context
    context = ''
  }

  let single: SingleInsight | null = null
  try {
    single = await callOpenAISingleInsight(String(idea.idea_topic || ''), context)
  } catch (e) {
    return { inserted: false }
  }
  if (!single) return { inserted: false }

  const row: any = {
    user_id: idea.user_id,
    idea_id: idea.id,
    idea_topic: idea.idea_topic,
    insight: single,
    status: 'draft'
  }

  const { data: inserted, error: insErr } = await supabase
    .from('insights')
    .insert(row)
    .select('id')
    .single()

  if (insErr) throw insErr
  return { inserted: true, insightId: inserted?.id }
}


