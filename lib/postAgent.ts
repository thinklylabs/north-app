import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js'
import { claudeMessage } from '@/lib/claude'

type PostDraft = {
  template_used: string
  hook: string
  post: string
}

type PostResponse = {
  template_used: string
  hook: string
  post: string
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

function buildPostPrompt(idea_topic: string, idea_summary: string, idea_eq: string, idea_takeaway: string, hook: string, insight: any) {
  return [
    '# 🧱 Post Curator (Builder Tone, Founder Voice)',
    '',
    '## 🎯 Objective',
    'Turn **`post_idea`** (and optionally RAG insights + hook) into **1 polished, LinkedIn-ready draft (160–180 words)**.',
    'The draft should sound like a founder writing in public — **structured, specific, but human.**',
    '',
    '---',
    '',
    '## 🧩 Template Selection',
    '',
    'Pick the **single most fitting template** from these options:',
    '',
    '### 1. **Contrarian Hot Take**',
    'Open with a sharp or unpopular opinion. Explain what most people miss.',
    'Back it with 2–3 grounded examples or observations.',
    'End with a blunt takeaway or question that challenges status quo.',
    '',
    '### 2. **How-To Workflow**',
    'Frame as a quick playbook or operating principle. Hook with a result or speed claim.',
    'Share 3–5 clear steps or actions. Mention a common pitfall.',
    'Close by nudging readers to try it or comment.',
    '',
    '### 3. **Playbook SOP**',
    'Show a repeatable process your team uses. Hook with a benefit.',
    'Add a 1-line setup, then outline 3–6 actions or decisions.',
    'Drop one outcome or metric. End with an invite to ask for details or playbook.',
    '',
    '### 4. **Ad Format Case Study**',
    'Tell a mini experiment story. Hook with what you tested.',
    'Share 3–5 findings (what worked, why, how). Drop one specific metric or result.',
    'End with a call to try or DM for the framework.',
    '',
    '### 5. **Tool Tierlist**',
    'Rank or categorize tools. Hook with "what we actually use" or "tools that didn\'t make the cut."',
    'Share short S/A/B tier lines. Add one line on how to choose.',
    'End by inviting readers to share their stack.',
    '',
    '### 6. **Persona Prompt**',
    'Center around AI creative prompting. Hook with a common mistake.',
    'Define a clear persona (role, goal, pain). Share the exact improved prompt.',
    'End with an invite to share their own personas.',
    '',
    '### 7. **Long Form Story**',
    'Tell a personal or founder story. Hook with a specific moment or realization.',
    'Build in 2–3 short paras (setup → tension → shift).',
    'End with a takeaway that feels earned, not generic.',
    '',
    '### 8. **Ops Culture**',
    'Talk about building culture, rituals, or systems. Hook with a benefit or realization.',
    'Share 3–5 specific initiatives or lessons.',
    'End with a metric or reflection that shows impact.',
    '',
    '### 9. **Rapid Experiment**',
    'Highlight iteration and speed. Hook with the number of experiments.',
    'Share 2–3 variants or lessons. End with a short insight about learning velocity and a question to readers.',
    '',
    '### 10. **Giveaway Lead Magnet**',
    'Announce or offer a free resource. Hook with "I\'m giving away X."',
    'Share 2–3 things inside. Mention how to get it (comment, DM).',
    'Keep it crisp and direct.',
    '',
    '---',
    '',
    '## 🧠 Analysis Rules',
    '',
    '### 🎣 Hook',
    '- Use hook text from the Hook Strategist output if available; else derive naturally.',
    '- Hook should be 1 sentence, scroll-stopping, and clear.',
    '',
    '### ✍️ Writing Style',
    '- Short paragraphs (1–3 lines each).',
    '- Use **→** or bullets for clarity if it fits naturally.',
    '- Second-person voice ("you", "your") for connection.',
    '- First-person authority ("i", "we") for credibility.',
    '- 1–2 **ALLCAPS** words for emphasis (not gimmick).',
    '- End with a **clean CTA**: comment, DM, share, or grounded opinion.',
    '',
    '---',
    '',
    '## 🧱 Requirements',
    '',
    '### 🧩 Logic',
    '1. **Pick the best template** for this idea (state it in `template_used`).',
    '2. **Justify the fit** — why this template delivers the idea\'s value.',
    '3. Use **Hook Strategist output** if available — else derive naturally.',
    '4. Write **naturally**, not mechanically — no template headers or robotic transitions.',
    '5. Embed **RAG insights conversationally** (facts, frameworks, or examples).',
    '6. Ensure the post feels **authentic** and **specific** — no generic AI phrasing.',
    '',
    '### ⚙️ Hard Rules',
    '- Exactly **1 draft**, **160–180 words**.',
    '- Must use **one of the 10 templates** above.',
    '- Output must include:',
    '  - `template_used` (template name)',
    '  - `hook` (1–2 sentence opening)',
    '  - `post` (160–180 word body)',
    '- **No emojis. No hashtags. No filler.**',
    '- Tone must stay **human, reflective, and specific** — avoid generic AI phrasing.',
    '',
    '---',
    '',
    '## 🧾 Output Format',
    '',
    '```json',
    '{',
    '  "template_used": "string (name of the chosen template)",',
    '  "hook": "string (1–2 sentence opening line)",',
    '  "post": "string (160–180 word LinkedIn-ready draft in builder tone)"',
    '}',
    '```',
    '',
    'Post idea details:',
    `Topic: "${idea_topic}"`,
    `Summary: "${idea_summary}"`,
    `Emotional angle: "${idea_eq}"`,
    `Takeaway: "${idea_takeaway}"`,
    `Hook: "${hook}"`,
    '',
    'RAG insights:',
    JSON.stringify(insight, null, 2).slice(0, 2000),
    '',
    'Return ONLY the JSON object.'
  ].join('\n')
}

export async function generatePostFromHookAndInsight(ideaId: number, insightId: number, postId: number): Promise<{ post: string }> {
  const db = getAdmin()

  const { data: idea, error: ideaErr } = await db
    .from('ideas')
    .select('id, idea_topic, idea_summary, idea_eq, idea_takeaway')
    .eq('id', ideaId)
    .maybeSingle()
  if (ideaErr) throw ideaErr
  if (!idea) throw new Error('Idea not found')

  const { data: post, error: postErr } = await db
    .from('posts')
    .select('id, user_id, post_hook')
    .eq('id', postId)
    .maybeSingle()
  if (postErr) throw postErr
  if (!post) throw new Error('Post row not found')

  const { data: insight, error: insErr } = await db
    .from('insights')
    .select('id, insight')
    .eq('id', insightId)
    .maybeSingle()
  if (insErr) throw insErr
  if (!insight) throw new Error('Insight not found')

  const prompt = buildPostPrompt(
    String(idea.idea_topic || ''),
    String(idea.idea_summary || ''),
    String(idea.idea_eq || ''),
    String(idea.idea_takeaway || ''),
    String(post.post_hook || ''),
    insight.insight
  )
  
  const response = await claudeMessage(prompt)
  
  try {
    const cleanResponse = cleanJsonResponse(response)
    console.log('Raw Claude response:', response)
    console.log('Cleaned response:', cleanResponse)
    
    if (!isValidJSON(cleanResponse)) {
      throw new Error('Invalid JSON after cleaning')
    }
    
    const parsed: PostResponse = JSON.parse(cleanResponse)
    const firstPost = parsed.post || 'No post generated'
    
    const { error: updErr } = await db
      .from('posts')
      .update({ post_content: firstPost, insight_id: insightId })
      .eq('id', postId)
    if (updErr) throw updErr

    return { post: firstPost }
  } catch (error) {
    console.error('Failed to parse post response:', error)
    console.error('Raw response:', response)
    
    // Enhanced fallback with retry
    const retryPrompt = `Return ONLY valid JSON in this exact format:
{
  "template_used": "template name",
  "hook": "hook text",
  "post": "post content"
}

Do not include any markdown, explanations, or additional text.`
    
    try {
      const retryResponse = await claudeMessage(retryPrompt)
      const retryCleaned = cleanJsonResponse(retryResponse)
      
      if (isValidJSON(retryCleaned)) {
        const retryParsed: PostResponse = JSON.parse(retryCleaned)
        const firstPost = retryParsed.post || 'No post generated'
        
        const { error: updErr } = await db
          .from('posts')
          .update({ post_content: firstPost, insight_id: insightId })
          .eq('id', postId)
        if (updErr) throw updErr

        return { post: firstPost }
      }
    } catch (retryError) {
      console.error('Retry also failed:', retryError)
    }
    
    // Final fallback to simple post generation
    const fallbackPrompt = `Write a LinkedIn post starting with this hook: "${post.post_hook}"\n\nBased on this insight: ${JSON.stringify(insight.insight)}`
    const fallbackPost = await claudeMessage(fallbackPrompt)
    let postText = ensureHookPresent(fallbackPost, String(post.post_hook || ''))
    postText = enforceLengthAndCompleteness(postText, 500, 280, 800)
    
    const { error: updErr } = await db
      .from('posts')
      .update({ post_content: postText, insight_id: insightId })
      .eq('id', postId)
    if (updErr) throw updErr

    return { post: postText }
  }
}

function enforceLengthAndCompleteness(text: string, target: number, min: number, max: number): string {
  let t = String(text || '').replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim()
  // Remove wrapping quotes if present
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    t = t.slice(1, -1).trim()
  }
  if (t.length <= max && t.length >= min) {
    return ensureTerminalPunctuation(t)
  }
  if (t.length > max) {
    // Prefer cut at sentence boundary within range
    const upToMax = t.slice(0, max)
    const lastPeriod = upToMax.lastIndexOf('.')
    const lastExcl = upToMax.lastIndexOf('!')
    const lastQ = upToMax.lastIndexOf('?')
    const cutAt = Math.max(lastPeriod, lastExcl, lastQ)
    if (cutAt >= min - 20) {
      return ensureTerminalPunctuation(upToMax.slice(0, cutAt + 1).trim())
    }
    const lastSpace = upToMax.lastIndexOf(' ')
    return ensureTerminalPunctuation((lastSpace > min ? upToMax.slice(0, lastSpace) : upToMax).trim())
  }
  // If shorter than min, we won't re-call the model; just ensure punctuation
  return ensureTerminalPunctuation(t)
}

function ensureTerminalPunctuation(text: string): string {
  const trimmed = text.trim()
  return /[\.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`
}

function ensureHookPresent(text: string, hook: string): string {
  const t = String(text || '').trim()
  const h = String(hook || '').trim()
  if (!h) return t
  // If hook already appears near the beginning, keep as-is
  const idx = t.toLowerCase().indexOf(h.toLowerCase())
  if (idx >= 0 && idx < 40) return t
  // Otherwise, prepend hook with a space separator
  return `${h} ${t}`.trim()
}


