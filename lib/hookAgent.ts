import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js'
import { claudeMessage } from '@/lib/claude'

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing Supabase env')
  return createSupabaseAdminClient(url, key)
}

/*
Writing style (editable):
- Native to LinkedIn, concise, punchy, no fluff.
- No hashtags, no emojis unless essential.
- Max 1–2 lines. Lead with a tension or payoff.
- Call out the core value fast; keep curiosity high, not clickbait.
*/
function buildHookPrompt(idea_topic: string, idea_eq?: string | null, idea_takeaway?: string | null) {
  return [
    'ROLE: Senior LinkedIn copywriter.',
    '',
    'TASK: Write ONE LinkedIn hook ONLY (plain text).',
    '- Center it strictly on the idea_topic below.',
    '- Use idea_eq + idea_takeaway only to enrich specifics.',
    '- 1–2 lines max. No hashtags. No emojis unless essential.',
    '',
    `idea_topic: "${idea_topic}"`,
    `idea_eq: "${(idea_eq || '').slice(0, 80)}"`,
    `idea_takeaway: "${(idea_takeaway || '').slice(0, 240)}"`,
    '',
    'Return only the hook. Nothing else.'
  ].join('\n')
}

export async function generateHookForIdea(ideaId: number): Promise<{ hook: string; postId: number }> {
  const db = getAdmin()

  const { data: idea, error: ideaErr } = await db
    .from('ideas')
    .select('id, user_id, idea_topic, idea_eq, idea_takeaway')
    .eq('id', ideaId)
    .maybeSingle()
  if (ideaErr) throw ideaErr
  if (!idea) throw new Error('Idea not found')

  const prompt = buildHookPrompt(String(idea.idea_topic || ''), idea.idea_eq, idea.idea_takeaway)
  const hook = (await claudeMessage(prompt)).slice(0, 300)

  const { data: postRow, error: postErr } = await db
    .from('posts')
    .insert({
      user_id: idea.user_id,
      idea_id: idea.id,
      post_content: '',
      post_hook: hook,
      status: 'draft'
    })
    .select('id')
    .single()
  if (postErr) throw postErr

  return { hook, postId: postRow.id }
}


