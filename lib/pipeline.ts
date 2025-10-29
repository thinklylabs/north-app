import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js'
import { generateHookForIdea } from '@/lib/hookAgent'
import { generatePostFromHookAndInsight } from '@/lib/postAgent'

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing Supabase env')
  return createSupabaseAdminClient(url, key)
}

async function getLatestInsightIdForIdea(ideaId: number): Promise<number | null> {
  const db = getAdmin()
  const { data, error } = await db
    .from('insights')
    .select('id')
    .eq('idea_id', ideaId)
    .order('created_at', { ascending: false })
    .limit(1)
  if (error) throw error
  return data?.[0]?.id ?? null
}

export async function runHookAndPostPipelineForIdea(ideaId: number, isFromCron?: boolean): Promise<{ postId?: number }> {
  const insightId = await getLatestInsightIdForIdea(ideaId)
  if (!insightId) return {}

  const { postId } = await generateHookForIdea(ideaId, isFromCron)
  await generatePostFromHookAndInsight(ideaId, insightId, postId, isFromCron)
  return { postId }
}


