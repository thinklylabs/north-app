import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js'

const { tavily } = require('@tavily/core')

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) throw new Error('Missing Supabase env')
  return createSupabaseAdminClient(url, serviceKey)
}

async function getOrCreateTavilySource(userId: string) {
  const supabaseAdmin = getSupabaseAdmin()
  
  const { data: existingSource } = await supabaseAdmin
    .from('content_sources')
    .select('id')
    .eq('user_id', userId)
    .eq('source_type', 'tavily_search')
    .eq('source_name', 'weekly_themes_search')
    .maybeSingle()

  if (existingSource) {
    return existingSource
  }

  const { data: newSource, error } = await supabaseAdmin
    .from('content_sources')
    .insert({
      user_id: userId,
      source_type: 'tavily_search',
      source_name: 'weekly_themes_search',
      config: {}
    })
    .select('id')
    .single()

  if (error) throw error
  return newSource
}

export async function POST(req: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const body = await req.json().catch(() => ({})) as { 
      user_id?: string; 
      themes?: string[];
      force?: boolean;
    }

    const userId = body.user_id
    const themes = body.themes
    const force = body.force || false

    if (!userId) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 })
    }

    if (!themes || themes.length === 0) {
      return NextResponse.json({ error: 'themes are required' }, { status: 400 })
    }

    // Check if we already ran this week (unless forced)
    if (!force) {
      const source = await getOrCreateTavilySource(userId)
      const { data: recentSearch } = await supabaseAdmin
        .from('raw_content')
        .select('created_at')
        .eq('source_id', source.id)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(1)

      if (recentSearch && recentSearch.length > 0) {
        return NextResponse.json({ 
          message: 'Tavily search already ran this week',
          skipped: true 
        })
      }
    }

    // Perform Tavily search
    const client = tavily({ apiKey: process.env.TAVILY_API_KEY })
    const searchQuery = `news, trends and insights on the following themes - ${themes.join(', ')}`
    
    console.log(`Performing Tavily search for user ${userId} with themes: ${themes.join(', ')}`)
    
    const searchResults = await client.search(searchQuery, {
      includeAnswer: "advanced",
      searchDepth: "advanced",
      timeRange: "week"
    })

    if (!searchResults || !searchResults.results || searchResults.results.length === 0) {
      return NextResponse.json({ message: 'No search results found' })
    }

    // Format content for storage
    const content = searchResults.results
      .map((result: any) => {
        const title = result.title || 'Untitled'
        const url = result.url || ''
        const content = result.content || ''
        const publishedDate = result.published_date || new Date().toISOString()
        
        return `${title}\n${url}\nPublished: ${publishedDate}\n\n${content}`
      })
      .join('\n\n---\n\n')

    // Get or create Tavily content source
    const source = await getOrCreateTavilySource(userId)

    // Insert into raw_content
    const { data: rawContent, error: rawInsertError } = await supabaseAdmin
      .from('raw_content')
      .insert({
        source_id: source.id,
        title: 'Tavily Weekly Search',
        content: content,
        metadata: {
          themes: themes,
          search_query: searchQuery,
          results_count: searchResults.results.length,
          search_date: new Date().toISOString()
        }
      })
      .select('id')
      .single()

    if (rawInsertError) {
      return NextResponse.json({ error: rawInsertError.message }, { status: 500 })
    }

    console.log(`Stored Tavily search results in raw_content id: ${rawContent.id}`)

    // Process the raw content (chunking and embedding)
    try {
      const { processRawDocument } = await import('@/lib/processRaw')
      await processRawDocument(rawContent.id)
      console.log(`Processed raw content ${rawContent.id} into document_sections`)
    } catch (error) {
      console.error('Failed to process raw document:', error)
      // Continue even if processing fails
    }

    // Generate ideas from the content
    try {
      const { generateIdeaForRawId } = await import('@/lib/ideas')
      await generateIdeaForRawId(rawContent.id, true)
      console.log(`Generated ideas for raw content ${rawContent.id}`)
    } catch (error) {
      console.error('Failed to generate ideas:', error)
      // Continue even if idea generation fails
    }

    return NextResponse.json({
      success: true,
      raw_content_id: rawContent.id,
      themes_searched: themes,
      results_count: searchResults.results.length
    })

  } catch (error: any) {
    console.error('Tavily search error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
