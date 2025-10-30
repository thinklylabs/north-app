type AllowedSource =
  | 'slack_messages'
  | 'substack_feeds'
  | 'files'
  | 'notion'
  | 'manual_rss'

export type ExtractorTheme = {
  theme: string
  context_excerpt: string
  raw_quotes: string[]
  distilled_learning: string
  emotional_appeal: string
  personal_anchor: string
  hook_pattern: 'stat/result' | 'imperative' | 'question' | 'list' | 'contrarian/timeline'
  content_type: 'tactical' | 'case study' | 'contrarian' | 'personal/announcement'
  topic_pillar: 'creative' | 'AI workflow' | 'metrics' | 'scaling' | 'ops' | 'other'
  linkedin_angles: string[]
}

export type ExtractorOutput = {
  source_type: AllowedSource
  title: string | null
  cleaned_content: string
  themes: ExtractorTheme[]
  guided_context_for_ideas: string
}

function isAllowedSource(source: string): source is AllowedSource {
  return (
    source === 'slack_messages' ||
    source === 'substack_feeds' ||
    source === 'files' ||
    source === 'notion' ||
    source === 'manual_rss'
  )
}

function isLongForm(text: string): boolean {
  const trimmed = (text || '').trim()
  const lineBreaks = (trimmed.match(/\n/g) || []).length
  return trimmed.length >= 800 || lineBreaks >= 15
}

function lightClean(text: string): string {
  let t = (text || '').trim()
  t = t.replace(/unsubscribe here.*$/gim, '')
  t = t.replace(/^\s*sent from my (iphone|android).*$\n?/gim, '')
  t = t.replace(/\n-{3,}\n/g, '\n')
  t = t.replace(/\n{3,}/g, '\n\n')
  return t.trim()
}

function buildPrompt(icp: string, sourceType: AllowedSource, title: string | null, content: string) {
  const system = [
    'You are the Detail Extractor (ghostwriter fuel, builder tone).',
    'Turn messy long-form input into a compact LinkedIn playbook with 3–6 strongest themes.',
    'Avoid corporate language. Output strictly matches the JSON schema.',
  ].join('\n')

  const schema = `
[
  {
    "theme": "string",
    "context_excerpt": "string (2–3 sentences from input around this theme)",
    "raw_quotes": ["array of short verbatim quotes"],
    "distilled_learning": "string (1–2 lines, why it matters)",
    "emotional_appeal": "frustration|pride|curiosity|vulnerability|excitement|disbelief",
    "personal_anchor": "string or N/A",
    "hook_pattern": "stat/result | imperative | question | list | contrarian/timeline",
    "content_type": "tactical | case study | contrarian | personal/announcement",
    "topic_pillar": "creative | AI workflow | metrics | scaling | ops | other",
    "linkedin_angles": ["2–3 angles"]
  }
]
Rules:
- 3–6 themes only.
- Keep quotes verbatim (minimal cleaning).
- Distilled learnings <= 2 lines, builder tone.
- Scannable bullets. No prose outside JSON.
`.trim()

  const coverage = `
Coverage requirements:
- tactics/frameworks
- metrics/results
- contradictions/myths
- mindset shifts/founder lessons
- future-facing ideas
- emotional/vulnerable moments
`.trim()

  const header = `[source_type: ${sourceType}]${title ? `\n[title: ${title}]` : ''}`
  const user = [
    `ICP profile (use as lens):`,
    icp.slice(0, 2000),
    '',
    'Context:',
    header,
    '',
    'Content:',
    content.slice(0, 20000),
    '',
    coverage,
    schema,
  ].join('\n')

  return { system, user }
}

async function callOpenAI(system: string, user: string): Promise<ExtractorTheme[]> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set')
  }
  console.log('[extractor] Calling OpenAI with constrained JSON schema')
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    }),
  })
  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    console.error('[extractor] OpenAI error', res.status, errText)
    throw new Error(`OpenAI error ${res.status}: ${errText}`)
  }
  const json = await res.json()
  const content = json?.choices?.[0]?.message?.content || ''
  console.log('[extractor] Raw OpenAI content length:', content.length)
  let parsed: any
  try {
    parsed = JSON.parse(content)
  } catch (e) {
    console.error('[extractor] Failed to parse OpenAI JSON content')
    return []
  }
  const arr = Array.isArray(parsed)
    ? parsed
    : (Array.isArray(parsed?.data) ? parsed.data : (Array.isArray(parsed?.themes) ? parsed.themes : []))
  if (!Array.isArray(arr)) return []
  return arr as ExtractorTheme[]
}

export async function runExtractorForLongform(params: {
  source_type: string
  title?: string | null
  content: string
  icp_profile: string
}): Promise<ExtractorOutput> {
  if (!isAllowedSource(params.source_type)) {
    throw new Error('Extractor only supports slack_messages, substack_feeds, files, notion, manual_rss')
  }
  const text = (params.content || '').trim()
  if (!isLongForm(text)) {
    throw new Error('Not long-form; extractor disabled for short inputs')
  }

  const cleaned = lightClean(text)
  console.log('[extractor] Start', {
    source_type: params.source_type,
    title: params.title || null,
    chars: cleaned.length,
    lines: (cleaned.match(/\n/g) || []).length,
  })

  const { system, user } = buildPrompt(params.icp_profile, params.source_type, params.title ?? null, cleaned)
  const themes = await callOpenAI(system, user)
  const limited = (themes || []).slice(0, 6)
  if (limited.length < 3) {
    console.warn('[extractor] Fewer than 3 themes extracted:', limited.length)
  }

  const guided = [
    `[Guidance: Extracted Themes x${limited.length}]`,
    ...limited.map((t, i) => {
      const q = (t.raw_quotes || []).slice(0, 2).map(s => `• “${s}”`).join('\n')
      return [
        `#${i + 1} ${t.theme}`,
        `- distilled: ${t.distilled_learning}`,
        `- pillar: ${t.topic_pillar} | type: ${t.content_type} | hook: ${t.hook_pattern}`,
        q ? `- quotes:\n${q}` : '',
      ].filter(Boolean).join('\n')
    }),
  ].join('\n\n')

  console.log('[extractor] Themes extracted:', limited.length)

  return {
    source_type: params.source_type,
    title: params.title ?? null,
    cleaned_content: cleaned,
    themes: limited,
    guided_context_for_ideas: guided,
  }
}


