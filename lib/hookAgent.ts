import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js'
import { claudeMessage } from '@/lib/claude'

type HookResult = {
  style: string
  source_idea: string
  hook: string
}

type HookResponse = {
  hooks: HookResult[]
  notes: string
}

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing Supabase env')
  return createSupabaseAdminClient(url, key)
}

function cleanJsonResponse(response: string): string {
  // Remove markdown code blocks
  let cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  
  // Remove any text before the first { and after the last }
  const firstBrace = cleaned.indexOf('{')
  const lastBrace = cleaned.lastIndexOf('}')
  
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1)
  }
  
  // Conservative cleaning - only fix obvious issues
  cleaned = cleaned
    .replace(/\n\s*\n/g, '\n') // Remove multiple newlines but preserve single ones
    .replace(/\s+$/, '') // Remove trailing whitespace
    .trim()
  
  return cleaned
}

function isValidJSON(str: string): boolean {
  try {
    JSON.parse(str)
    return true
  } catch {
    return false
  }
}

function buildHookPrompt(idea_topic: string, idea_summary: string, idea_eq?: string | null, idea_takeaway?: string | null) {
  return [
    '# :brain: Hook Strategist (Conversion Focus, Builder Tone)',
    '',
    '## :dart: Objective',
    'Given multiple **`post_ideas`**, generate **exactly 4 high-performing opening hooks** that align with proven founder content patterns and drive **scroll-stopping engagement**.',
    '',
    '---',
    '',
    '## :gear: Requirements',
    '',
    '### :mag: Logic',
    '1. **Read all post_ideas** and identify the **4 sharpest, most distinct angles**.',
    '2. **Map each hook** to a unique performance pattern:',
    '   - **Stat / Result** → numeric proof, milestone, or before → after contrast.',
    '   - **Imperative / Command** → direct, no-nonsense call to think or act.',
    '   - **Question / Curiosity** → open loop that teases tension or learning.',
    '   - **Contrarian / Myth / Listicle / Timeline** → choose whichever fits best per input.',
    '3. For **timeline hooks**, highlight evolution or growth.',
    '   For **listicles**, emphasize simplicity of structure (e.g. "3 things that…").',
    '   For **contrarian hooks**, spotlight friction against a common belief.',
    '4. Use `forward_guidance` and `critique_note` (if provided) to **refine phrasing, tone, and edge**.',
    '5. Mirror **authentic founder tone markers**:',
    '   - Occasional CAPS or line breaks for emphasis.',
    '   - Second-person ("you") framing.',
    '   - Confident "i/we" narrative voice when relevant.',
    '6. Ensure hooks **differ in rhythm, intent, and topic pillar** — covering at least one of:',
    '   - creative',
    '   - AI workflow',
    '   - metrics',
    '   - scaling/ops',
    '',
    '---',
    '',
    '### :bricks: Hard Rules',
    '- Exactly **4 hooks total**.',
    '- Each hook ≤ **15 words** (1 sentences only).',
    '- Must feel **human, builder, punchy** — no buzzwords, jargon, or fluff.',
    '- Each hook must **clearly tie back** to its `source_idea`.',
    '- Avoid repeating **sentence structure or rhythm**.',
    '- At least one hook must tie to a **dominant topic pillar** (*creative, metrics, AI, scaling/ops*).',
    '- **No emojis or hashtags.**',
    '',
    '---',
    '',
    '## :receipt: Output Format',
    '',
    '```json',
    '{',
    '  "hooks": [',
    '    {',
    '      "style": "string (stat/result | imperative | question | contrarian/myth | listicle | timeline)",',
    '      "source_idea": "string (reference to which post_idea it came from)",',
    '      "hook": "string (max 15 words, builder-tone, scroll-stopping opener)"',
    '    }',
    '  ],',
    '  "notes": "string (2–3 lines summarizing why these 4 hooks were chosen, what emotions or contrasts they trigger, and how they follow proven founder post patterns)"',
    '}',
    '```',
    '',
    'Post idea details:',
    `Topic: "${idea_topic}"`,
    `Summary: "${idea_summary}"`,
    `Emotional angle: "${idea_eq || ''}"`,
    `Takeaway: "${idea_takeaway || ''}"`,
    '',
    'Return ONLY the JSON object.'
  ].join('\n')
}

export async function generateHookForIdea(ideaId: number): Promise<{ hook: string; postId: number }> {
  const db = getAdmin()

  const { data: idea, error: ideaErr } = await db
    .from('ideas')
    .select('id, user_id, idea_topic, idea_summary, idea_eq, idea_takeaway')
    .eq('id', ideaId)
    .maybeSingle()
  if (ideaErr) throw ideaErr
  if (!idea) throw new Error('Idea not found')

  const prompt = buildHookPrompt(
    String(idea.idea_topic || ''), 
    String(idea.idea_summary || ''), 
    idea.idea_eq, 
    idea.idea_takeaway
  )
  
  const response = await claudeMessage(prompt)
  
  try {
    const cleanResponse = cleanJsonResponse(response)
    console.log('Raw Claude response:', response)
    console.log('Cleaned response:', cleanResponse)
    
    if (!isValidJSON(cleanResponse)) {
      throw new Error('Invalid JSON after cleaning')
    }
    
    const parsed: HookResponse = JSON.parse(cleanResponse)
    const firstHook = parsed.hooks[0]?.hook || 'No hook generated'
    
    const { data: postRow, error: postErr } = await db
      .from('posts')
      .insert({
        user_id: idea.user_id,
        idea_id: idea.id,
        post_content: '',
        post_hook: firstHook,
        status: 'draft'
      })
      .select('id')
      .single()
    if (postErr) throw postErr

    return { hook: firstHook, postId: postRow.id }
  } catch (error) {
    console.error('Failed to parse hook response:', error)
    console.error('Raw response:', response)
    
    // Enhanced fallback with retry
    const retryPrompt = `Return ONLY valid JSON in this exact format:
{
  "hooks": [
    {
      "style": "stat/result",
      "source_idea": "idea reference",
      "hook": "simple hook text"
    }
  ],
  "notes": "brief explanation"
}

Do not include any markdown, explanations, or additional text.`
    
    try {
      const retryResponse = await claudeMessage(retryPrompt)
      const retryCleaned = cleanJsonResponse(retryResponse)
      
      if (isValidJSON(retryCleaned)) {
        const retryParsed: HookResponse = JSON.parse(retryCleaned)
        const firstHook = retryParsed.hooks[0]?.hook || 'No hook generated'
        
        const { data: postRow, error: postErr } = await db
          .from('posts')
          .insert({
            user_id: idea.user_id,
            idea_id: idea.id,
            post_content: '',
            post_hook: firstHook,
            status: 'draft'
          })
          .select('id')
          .single()
        if (postErr) throw postErr

        return { hook: firstHook, postId: postRow.id }
      }
    } catch (retryError) {
      console.error('Retry also failed:', retryError)
    }
    
    // Final fallback to simple hook
    const fallbackHook = (await claudeMessage(`Write a LinkedIn hook for: ${idea.idea_topic}`)).slice(0, 300)
    
    const { data: postRow, error: postErr } = await db
      .from('posts')
      .insert({
        user_id: idea.user_id,
        idea_id: idea.id,
        post_content: '',
        post_hook: fallbackHook,
        status: 'draft'
      })
      .select('id')
      .single()
    if (postErr) throw postErr

    return { hook: fallbackHook, postId: postRow.id }
  }
}


