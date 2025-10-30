import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js'

type SingleInsight = {
  topic: string
  insight: string
  insight_type: string
  value_added: string
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

  // Ensure data is always an array
  let sections = Array.isArray(data) ? data : [];

  if (!sections || sections.length === 0) {
    console.log('[insights] No relevant RAG context found (threshold 0.7); proceeding with empty context')
    return ''
  }

  const contextText = (sections || [])
    .map((c: any, i: number) => `(${i + 1}) [${c.section_type}] ${c.content}`)
    .join('\n')

  return String(contextText || '').slice(0, 12000)
}

function buildSystemPrompt(): string {
  return 'You are an Insight Retriever (contextual enrichment via RAG). Use the topic, summary, and eq from each post_idea to pull 1 contextually relevant insights, examples, or references from the RAG source — anything that makes the idea sharper, richer, or more credible when turned into a post.\n\nFollow these exact requirements:\n- Treat topic + summary + eq as a holistic query — interpret what the idea is *really about* (theme, tension, energy)\n- Search the RAG for complementary material: facts, founder anecdotes, frameworks, contrasting opinions, or real-world parallels\n- Prioritize responses that *add depth*, not clutter — something that either proves, challenges, or extends the idea\n- Write the insight conversationally, as if a founder is dropping a smart reference mid-post — not quoting a report\n- You can mix evidence types (data, story, quote, observation) if they flow naturally\n- If no relevant insight is found, summarize a plausible contextual angle or leave \'no clear RAG insight\' (no fabrication)\n- Avoid rigid citation or corporate phrasing; the output should read like a builder adding a sharp layer of context\n- Tone: insightful, grounded, slightly informal — like a real operator referencing lived or observed proof\n\nOutput exactly 1 insights as JSON array with this schema:\n[\n  {\n    "topic": "string (copied from post_idea input for reference)",\n    "insight": "string (natural 2–4 sentence enrichment: story, data point, or idea that supports or contrasts the post idea)",\n    "insight_type": "string (story | example | stat | framework | observation | contrast | no_match)",\n    "value_added": "string (1 short line explaining how this enriches or shifts the perspective of the original idea)"\n  }\n]\n\nReturn ONLY a JSON array that matches the schema.'
}

function buildUserPrompt(topic: string, summary: string, eq: string, context: string, directInput?: string): string {
  return [
    `Post idea topic: "${topic}"`,
    `Summary: "${summary}"`,
    `Emotional angle: "${eq}"`,
    '',
    directInput ? 'Direct input (user thought):' : '',
    directInput ? String(directInput).slice(0, 2000) : '',
    directInput ? '' : '',
    'RAG context (use only if relevant; do not invent facts):',
    context,
    '',
    'Task:',
    '- Find 1 contextually relevant insights that enrich this post idea',
    '- Look for complementary material: facts, founder anecdotes, frameworks, contrasting opinions, or real-world parallels',
    '- Each insight should be 2–4 sentences, conversational and story-led',
    '- Avoid academic citations or corporate phrasing',
    '- If no relevant insight found, leave as "no clear RAG insight"',
  ].filter(Boolean).join('\n')
}

async function callOpenAISingleInsight(topic: string, summary: string, eq: string, context: string, directInput?: string): Promise<SingleInsight[]> {
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
        { role: 'user', content: buildUserPrompt(topic, summary, eq, context, directInput) }
      ],
      temperature: 0.35,
    })
  })

  if (!res.ok) {
    const err = await res.text().catch(() => '')
    throw new Error(`OpenAI error ${res.status}: ${err}`)
  }
  const json = await res.json()
  const content: string | undefined = json?.choices?.[0]?.message?.content
  if (!content) return []

  try {
    const parsed = JSON.parse(content)
    if (!Array.isArray(parsed)) return []

    const insights: SingleInsight[] = parsed.map((item) => ({
      topic: String(item.topic || '').slice(0, 300),
      insight: String(item.insight || '').slice(0, 1000),
      insight_type: String(item.insight_type || '').slice(0, 50),
      value_added: String(item.value_added || '').slice(0, 200),
    })).filter(i => i.topic && i.insight)

    return insights
  } catch {
    return []
  }
}

export async function generateInsightForIdeaId(ideaId: number): Promise<{ inserted: boolean; insightIds?: number[] }> {
  const supabase = getAdminClient()

  const { data: idea, error: ideaErr } = await supabase
    .from('ideas')
    .select('id, user_id, idea_topic, idea_summary, idea_eq, raw_id')
    .eq('id', ideaId)
    .maybeSingle()
  if (ideaErr) throw ideaErr
  if (!idea) throw new Error('Idea not found')

  // For thought dumps, include the original direct input in the prompt
  let directInput: string | undefined
  try {
    if (idea.raw_id) {
      const { data: raw } = await supabase
        .from('raw_content')
        .select('content, source_id')
        .eq('id', idea.raw_id as any)
        .maybeSingle()
      if (raw?.source_id) {
        const { data: source } = await supabase
          .from('content_sources')
          .select('source_type')
          .eq('id', raw.source_id as any)
          .maybeSingle()
        if (source?.source_type === 'thoughts') {
          directInput = String(raw.content || '').slice(0, 4000)
        }
      }
    }
  } catch {
    // best-effort only
  }

  let context = ''
  try {
    context = await fetchRagContextForTopic(String(idea.user_id), String(idea.idea_topic || ''))
  } catch (e) {
    // Best-effort: proceed without context
    context = ''
  }

  let insights: SingleInsight[] = []
  try {
    insights = await callOpenAISingleInsight(
      String(idea.idea_topic || ''), 
      String(idea.idea_summary || ''), 
      String(idea.idea_eq || ''), 
      context,
      directInput
    )
  } catch (e) {
    return { inserted: false }
  }
  if (!insights.length) return { inserted: false }

  const insertedIds: number[] = []

  for (const insight of insights) {
    const row: any = {
      user_id: idea.user_id,
      idea_id: idea.id,
      idea_topic: idea.idea_topic,
      insight: insight,
      status: 'draft'
    }

    const { data: inserted, error: insErr } = await supabase
      .from('insights')
      .insert(row)
      .select('id')
      .single()

    if (insErr) {
      console.error('Failed to insert insight:', insErr)
      continue
    }

    if (inserted?.id) {
      insertedIds.push(inserted.id)
    }
  }

  return { 
    inserted: insertedIds.length > 0, 
    insightIds: insertedIds 
  }
}


