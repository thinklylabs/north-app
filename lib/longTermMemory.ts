import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js'

function getAdminClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase credentials not configured')
  }
  return createSupabaseAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

async function generateEmbedding(text: string): Promise<number[]> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set')
  }

  const doRequest = async () =>
    fetch('https://api.openai.com/v1/embeddings', {
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

  let response: Response
  try {
    response = await doRequest()
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorText}`)
    }
  } catch (e) {
    response = await doRequest()
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorText}`)
    }
  }

  const json = await response.json()
  return json.data?.[0]?.embedding
}

/**
 * Retrieve comprehensive context about a user from their RAG database
 */
async function fetchUserContextFromRAG(userId: string): Promise<any[]> {
  const supabase = getAdminClient()
  
  // Get all document sections for this user by joining through the relationships
  // document_sections -> raw_content -> content_sources (which has user_id)
  const { data, error } = await supabase
    .from('document_sections')
    .select(`
      content, 
      section_type, 
      metadata, 
      created_at,
      raw_content!inner(
        content_sources!inner(
          user_id
        )
      )
    `)
    .eq('raw_content.content_sources.user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100) // Get up to 100 most recent sections

  if (error) {
    throw new Error(`Failed to fetch user context: ${error.message}`)
  }

  return data || []
}

/**
 * Get user's ideas, posts, and other generated content
 */
async function fetchUserGeneratedContent(userId: string) {
  const supabase = getAdminClient()
  
  // Fetch ideas
  const { data: ideas } = await supabase
    .from('ideas')
    .select('idea_topic, idea_eq, idea_takeaway, created_at, status')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)

  // Fetch posts if they exist
  const { data: posts } = await supabase
    .from('posts')
    .select('post_hook, post_body, created_at, status')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(30)

  // Fetch user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name, company_name, website_content')
    .eq('id', userId)
    .single()

  return {
    ideas: ideas || [],
    posts: posts || [],
    profile: profile || null
  }
}

/**
 * Build a comprehensive prompt for Claude to synthesize long-term memory
 */
function buildMemorySynthesisPrompt(
  ragContext: any[],
  generatedContent: { ideas: any[], posts: any[], profile: any }
): string {
  const contextText = ragContext
    .slice(0, 50) // Take top 50 sections
    .map((section, i) => `[${section.section_type || 'content'}] ${section.content}`)
    .join('\n\n')

  const ideasText = generatedContent.ideas
    .map(idea => `- ${idea.idea_topic}: ${idea.idea_takeaway}`)
    .join('\n')

  const postsText = generatedContent.posts
    .map(post => `- ${post.post_hook}`)
    .join('\n')

  const profileText = generatedContent.profile 
    ? `Name: ${generatedContent.profile.first_name || ''} ${generatedContent.profile.last_name || ''}
Company: ${generatedContent.profile.company_name || 'N/A'}
Website Content: ${generatedContent.profile.website_content || 'N/A'}`
    : 'No profile information available'

  return `Create a concise but comprehensive long-term memory profile for this user. Keep it under 2000 characters while covering key insights.

# USER PROFILE
${profileText}

# USER'S CONTENT & KNOWLEDGE BASE
${contextText || 'No content available yet'}

# USER'S IDEAS
${ideasText || 'No ideas yet'}

# USER'S POSTS
${postsText || 'No posts yet'}

---

Write a crisp memory summary (max 2000 chars) covering:
- WHO they are (role, background)
- WHAT they're working on (goals, projects)
- Key WINS and challenges
- Interests and expertise areas
- Communication style
- Main themes in their content

Be specific with examples but keep it concise. Focus on actionable insights that would help understand this user better.`
}

/**
 * Call OpenAI to synthesize the memory
 */
async function callOpenAIForMemorySynthesis(prompt: string): Promise<string> {
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
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at synthesizing user information into comprehensive memory profiles.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 2000
    })
  })

  if (!res.ok) {
    let txt = await res.text().catch(() => '')
    if (txt && txt.length > 4000) txt = txt.slice(0, 4000)
    throw new Error(`OpenAI error ${res.status}: ${txt}`)
  }

  const json = await res.json()
  const text: string = json?.choices?.[0]?.message?.content || ''
  
  return text.trim()
}

/**
 * Main function to generate and store long-term memory for a user
 */
export async function generateLongTermMemory(userId: string): Promise<{ success: boolean; memoryId?: number; error?: string }> {
  try {
    const supabase = getAdminClient()

    // 1. Fetch all user context
    console.log(`Fetching context for user ${userId}...`)
    const ragContext = await fetchUserContextFromRAG(userId)
    const generatedContent = await fetchUserGeneratedContent(userId)

    // 2. Build prompt and call OpenAI
    console.log('Building memory synthesis prompt...')
    const prompt = buildMemorySynthesisPrompt(ragContext, generatedContent)
    
    console.log('Calling OpenAI to synthesize memory...')
    const memoryContent = await callOpenAIForMemorySynthesis(prompt)

    // 3. Store in database
    console.log('Storing memory in database...')
    const { data, error } = await supabase
      .from('user_long_term_memory')
      .upsert({
        user_id: userId,
        memory_content: memoryContent,
        last_updated: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select('id')
      .single()

    if (error) {
      throw new Error(`Failed to store memory: ${error.message}`)
    }

    console.log(`Memory generated successfully for user ${userId}`)
    return { success: true, memoryId: data?.id }

  } catch (error) {
    console.error('Error generating long-term memory:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * Retrieve the long-term memory for a user
 */
export async function getUserLongTermMemory(userId: string) {
  const supabase = getAdminClient()
  
  const { data, error } = await supabase
    .from('user_long_term_memory')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') { // Not found
      return { success: false, memory: null, error: 'No memory found for this user' }
    }
    return { success: false, memory: null, error: error.message }
  }

  return { success: true, memory: data }
}

