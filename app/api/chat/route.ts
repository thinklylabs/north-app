import { createClient as createServerSupabaseClient } from '@/lib/supabase/server';
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { message, user_id: userIdFromBody } = await request.json();
    const envTestUserId = process.env.NEXT_PUBLIC_TEST_USER_ID || process.env.TEST_USER_ID;

    const supabaseAuth = await createServerSupabaseClient();
    const { data: { user } } = await supabaseAuth.auth.getUser();
    const canBypassRLS = !!process.env.SUPABASE_SERVICE_ROLE_KEY && !user;
    const supabase = canBypassRLS
      ? createSupabaseAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
      : supabaseAuth;
    const effectiveUserId = user?.id ?? userIdFromBody ?? envTestUserId;
    if (!effectiveUserId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // 1. Generate embedding for the user's question
    const questionEmbedding = await generateEmbedding(message);

    // 2. Find relevant context using RAG
    let { data: relevantSections, error } = await supabase
      .rpc('match_document_sections', {
        query_embedding: questionEmbedding,
        match_threshold: 0.7,
        p_user_id: effectiveUserId,
        limit_count: 5
      })
      .select('content, metadata, section_type');

    if (error) {
      throw new Error(`RAG search error: ${error.message}`);
    }

    // Ensure relevantSections is always an array
    let sections = Array.isArray(relevantSections) ? relevantSections : [];

    // Fallback: widen threshold if nothing matched
    if (!sections || sections.length === 0) {
      const wider = await supabase
        .rpc('match_document_sections', {
          query_embedding: questionEmbedding,
          match_threshold: -1000000, // effectively disable threshold filter
          p_user_id: effectiveUserId,
          limit_count: 5
        })
        .select('content, metadata, section_type');
      if (!wider.error && wider.data && Array.isArray(wider.data)) {
        sections = wider.data;
      }
    }

    // Dev fallback: if still empty and a test user is configured, try with that user id
    if ((!sections || sections.length === 0) && envTestUserId && envTestUserId !== effectiveUserId) {
      const testUserTry = await supabase
        .rpc('match_document_sections', {
          query_embedding: questionEmbedding,
          match_threshold: -1000000,
          p_user_id: envTestUserId,
          limit_count: 5
        })
        .select('content, metadata, section_type');
      if (!testUserTry.error && testUserTry.data && Array.isArray(testUserTry.data)) {
        sections = testUserTry.data;
      }
    }

    // 3. Generate response using context
    if (!sections || sections.length === 0) {
      return NextResponse.json({
        success: true,
        response: "I couldn't find relevant context in your knowledge base to answer this. Try ingesting more related content or rephrasing your question.",
        context_used: 0
      });
    }

    const response = await generateChatResponse(message, sections);

    return NextResponse.json({ 
      success: true, 
      response,
      context_used: sections?.length || 0
    });

  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function generateChatResponse(question: string, context: any[]) {
  const contextText = context
    .map((c: any, i: number) => `(${i + 1}) [${c.section_type}] ${c.content}`)
    .join('\n');

  const doRequest = async () =>
    fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content:
              'You are a retrieval-augmented assistant. Use ONLY the provided context to answer. If the context is insufficient, explicitly say you do not have enough information. Do not invent facts. Keep responses concise and cite snippets using (1), (2), etc. corresponding to the provided context items.'
          },
          { role: 'system', content: `Context:\n${contextText.slice(0, 12000)}` },
          { role: 'user', content: question }
        ],
        temperature: 0.2,
        top_p: 0.9
      })
    });

  let response: Response;
  try {
    response = await doRequest();
    if (!response.ok) throw new Error(`OpenAI API error: ${response.statusText}`);
  } catch (e) {
    response = await doRequest();
    if (!response.ok) throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

async function generateEmbedding(text: string) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
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
    });

  let response: Response;
  try {
    response = await doRequest();
    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error details:', errorText);
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorText}`);
    }
  } catch (e) {
    response = await doRequest();
    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error details (retry):', errorText);
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorText}`);
    }
  }

  const data = await response.json();
  return data.data[0].embedding;
}
