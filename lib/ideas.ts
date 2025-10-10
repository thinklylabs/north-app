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

function buildPrompt(sourceType: string, title: string | null, content: string): { system: string; user: string } {
  const system = 'You are an expert content strategist. Extract one specific, actionable content idea from the provided material. Output strict JSON with keys: idea_topic, idea_summary, idea_eq, idea_takeaway. No prose outside JSON.'
  const header = `[source_type: ${sourceType}]${title ? `\n[title: ${title}]` : ''}`
  const user = `Context:\n${header}\n\nContent:\n${content.slice(0, 20000)}\n\nSchema (exact):\n{\n  "idea_topic": "string (<= 120 chars)",\n  "idea_summary": "string (<= 700 chars) – grounded, 2–4 sentences",\n  "idea_eq": "string (<= 160 chars) — a short description of the idea's emotional quotient (how it connects with people’s feelings: care, empathy, inspiration, relief, safety, pride, hope, urgency, belonging). Focus on the primary audience emotion and why they would care.",\n  "idea_takeaway": "string (<= 240 chars)"\n}\n\nInstructions:\n- Propose exactly 1 distinct idea grounded only in the content.\n- Be concise and specific; avoid vague topics.\n- For idea_eq, do NOT give a numeric score. Write a tight human-readable emotional angle (e.g., "Eases daily stress for new parents by ensuring safer school drop-offs" not just "high EQ").\n- Return ONLY a JSON object that matches the schema.\n\nExamples (for style of idea_eq only):\n- Idea: parking near schools → idea_eq: "Relieves parents’ anxiety with safer, faster school drop-offs"\n- Idea: carbon tracking for SMBs → idea_eq: "Gives founders pride and confidence by proving real climate impact"\n`
  return { system, user }
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

export async function generateIdeaForRawId(rawId: number): Promise<{ inserted: boolean; ideaId?: number; skippedDuplicate?: boolean }> {
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

  const { system, user } = buildPrompt(String(source.source_type || ''), raw.title || null, String(raw.content || ''))

  let idea: ExtractedIdea | null = null
  try {
    idea = await callOpenAIExtract(system, user)
  } catch (e) {
    console.error('OpenAI extract failed for raw_id', rawId, e)
    return { inserted: false }
  }
  if (!idea) return { inserted: false }

  const signature = await computeDedupeSignature(idea.idea_topic, idea.idea_takeaway || '')

  // Check duplicate for this user
  const { data: existing } = await supabase
    .from('ideas')
    .select('id')
    .eq('user_id', source.user_id)
    .eq('dedupe_signature', signature)
    .is('deleted_at', null)
    .maybeSingle()

  if (existing) {
    return { inserted: false, skippedDuplicate: true }
  }

  const insertRow: any = {
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

  const { data: inserted, error: insErr } = await supabase
    .from('ideas')
    .insert(insertRow)
    .select('id')
    .single()

  if (insErr) throw insErr
  // Best-effort: immediately generate a single consolidated insight for this idea
  try {
    const { generateInsightForIdeaId } = await import('@/lib/insights')
    if (inserted?.id) {
      await generateInsightForIdeaId(inserted.id)
      // Continue with Hook -> Post pipeline
      try {
        const { runHookAndPostPipelineForIdea } = await import('@/lib/pipeline')
        await runHookAndPostPipelineForIdea(inserted.id)
      } catch (e) {
        console.error('Failed Hook/Post pipeline for idea', inserted.id, e)
      }
    }
  } catch (e) {
    console.error('Failed to generate insight for idea', inserted?.id, e)
  }
  return { inserted: true, ideaId: inserted?.id }
}


