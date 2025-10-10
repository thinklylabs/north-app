import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js'
import { claudeMessage } from '@/lib/claude'

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing Supabase env')
  return createSupabaseAdminClient(url, key)
}

function buildPostPrompt(hook: string, insight: any) {
  return [
    'ROLE: Senior LinkedIn copywriter.',
    '',
    'TASK: Write ONE LinkedIn post that STARTS with the provided HOOK, then adds 2–4 short sentences that deliver clear value based on the insight.',
    '- Length target: 400–600 characters (min 280, max 800).',
    '- The HOOK must appear verbatim at the beginning of the post.',
    '- Self-contained, ends with terminal punctuation.',
    '- Absolutely no hashtags, no emojis, no lists. Plain text only.',
    '- Keep it focused and concrete; avoid jargon.',
    '',
    `HOOK:\n${hook.slice(0, 300)}`,
    '',
    'INSIGHT (structure):',
    JSON.stringify(insight, null, 2).slice(0, 2000),
    '',
    'Return only the post text (no title, no quotes). Ensure 280–800 characters total and include the hook at the start.'
  ].join('\n')
}

export async function generatePostFromHookAndInsight(ideaId: number, insightId: number, postId: number): Promise<{ post: string }> {
  const db = getAdmin()

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

  const prompt = buildPostPrompt(String(post.post_hook || ''), insight.insight)
  const raw = await claudeMessage(prompt)
  let postText = ensureHookPresent(raw, String(post.post_hook || ''))
  postText = enforceLengthAndCompleteness(postText, 500, 280, 800)

  const { error: updErr } = await db
    .from('posts')
    .update({ post_content: postText, insight_id: insightId })
    .eq('id', postId)
  if (updErr) throw updErr

  return { post: postText }
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


