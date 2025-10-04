import { createClient as createServerSupabaseClient } from '@/lib/supabase/server';
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, source_type, source_name, metadata, user_id: userIdFromBody } = body;
    const envTestUserId = process.env.NEXT_PUBLIC_TEST_USER_ID || process.env.TEST_USER_ID;

    const supabaseAuth = await createServerSupabaseClient();
    const { data: { user } } = await supabaseAuth.auth.getUser();
    const effectiveUserId = user?.id ?? userIdFromBody ?? envTestUserId;
    const canBypassRLS = !!process.env.SUPABASE_SERVICE_ROLE_KEY && !user && !!effectiveUserId;
    const supabase = canBypassRLS
      ? createSupabaseAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
      : supabaseAuth;
    if (!effectiveUserId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // 1. Get or create content source
    const { data: source, error: sourceError } = await supabase
      .from('content_sources')
      .select('id')
      .eq('source_type', source_type)
      .eq('source_name', source_name)
      .eq('user_id', effectiveUserId)
      .maybeSingle();

    let sourceId = source?.id;

    if (!sourceId) {
      const { data: insertedSource, error: insertSourceError } = await supabase
        .from('content_sources')
        .insert({
          source_type,
          source_name,
          user_id: effectiveUserId,
          config: metadata?.config || {}
        })
        .select('id')
        .single();

      if (insertSourceError) {
        throw new Error(`Failed to create content source: ${insertSourceError.message}`);
      }
      sourceId = insertedSource.id;
    }

    if (sourceError) {
      throw new Error(`Failed to create content source: ${sourceError.message}`);
    }

    // 2. Store raw content
    const { data: rawContent, error: contentError } = await supabase
      .from('raw_content')
      .insert({
        source_id: sourceId,
        title: metadata?.title || `${source_type} content`,
        content,
        metadata: metadata || {}
      })
      .select()
      .single();

    if (contentError) {
      throw new Error(`Failed to store content: ${contentError.message}`);
    }

    // 3. Process content into sections
    const sections = await processContentByType(content, source_type, metadata);

    // 4. Generate embeddings and store sections
    const embeddingPromises = sections.map(async (section) => {
      const embedding = await generateEmbedding(section.content);

      const { error: insertError } = await supabase
        .from('document_sections')
        .insert({
          document_id: rawContent.id,
          content: section.content,
          section_type: source_type,
          metadata: section.metadata,
          embedding
        });

      if (insertError) {
        throw new Error(`Failed to insert document section: ${insertError.message}`);
      }
    });

    await Promise.all(embeddingPromises);

    // 5. Mark as processed
    await supabase
      .from('raw_content')
      .update({ processed_at: new Date().toISOString() })
      .eq('id', rawContent.id);

    return NextResponse.json({ 
      success: true, 
      content_id: rawContent.id,
      sections_created: sections.length 
    });

  } catch (error) {
    console.error('Processing error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function processContentByType(content: string, sourceType: string, metadata: any) {
  switch (sourceType) {
    case 'slack':
      return processSlackMessages(content, metadata);
    case 'google_drive':
      return processGoogleDriveFile(content, metadata);
    case 'meeting':
      return processMeetingTranscript(content, metadata);
    case 'email':
      return processEmail(content, metadata);
    default:
      return processGenericContent(content, metadata);
  }
}

function processSlackMessages(content: string, metadata: any) {
  const messages = content.split('\n').filter(line => line.trim());
  return messages.map((message, index) => ({
    content: message.trim(),
    metadata: { 
      type: 'slack_message',
      channel: metadata.channel,
      user: metadata.user,
      timestamp: metadata.timestamp,
      message_index: index
    }
  }));
}

function processGoogleDriveFile(content: string, metadata: any) {
  const paragraphs = content.split('\n\n').filter(p => p.trim().length > 50);
  return paragraphs.map((paragraph, index) => ({
    content: paragraph.trim(),
    metadata: { 
      type: 'drive_file',
      file_name: metadata.file_name,
      file_id: metadata.file_id,
      paragraph_index: index
    }
  }));
}

function processMeetingTranscript(content: string, metadata: any) {
  const lines = content.split('\n');
  const sections = [];
  let currentSection = '';
  const maxChunkSize = 2000; // Keep chunks under token limit
  
  for (const line of lines) {
    if (line.trim().startsWith('Speaker') || line.trim().startsWith('Topic:')) {
      if (currentSection.trim()) {
        // Split large sections into smaller chunks
        const chunks = splitIntoChunks(currentSection.trim(), maxChunkSize);
        chunks.forEach((chunk, index) => {
          sections.push({
            content: chunk,
            metadata: { 
              type: 'meeting_segment',
              meeting_id: metadata.meeting_id,
              duration: metadata.duration,
              chunk_index: index
            }
          });
        });
      }
      currentSection = line + '\n';
    } else {
      currentSection += line + '\n';
    }
  }
  
  if (currentSection.trim()) {
    const chunks = splitIntoChunks(currentSection.trim(), maxChunkSize);
    chunks.forEach((chunk, index) => {
      sections.push({
        content: chunk,
        metadata: { 
          type: 'meeting_segment',
          meeting_id: metadata.meeting_id,
          duration: metadata.duration,
          chunk_index: index
        }
      });
    });
  }
  
  return sections;
}

function splitIntoChunks(text: string, maxSize: number): string[] {
  const chunks = [];
  const words = text.split(' ');
  
  let currentChunk = '';
  
  for (const word of words) {
    if ((currentChunk + ' ' + word).length > maxSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = word;
    } else {
      currentChunk += (currentChunk.length > 0 ? ' ' : '') + word;
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

function processEmail(content: string, metadata: any) {
  return [{
    content: content.trim(),
    metadata: { 
      type: 'email',
      subject: metadata.subject,
      from: metadata.from,
      date: metadata.date
    }
  }];
}

function processGenericContent(content: string, metadata: any) {
  const maxLength = 2000; // Increased but still under token limit
  const sections = [];
  
  for (let i = 0; i < content.length; i += maxLength) {
    sections.push({
      content: content.slice(i, i + maxLength),
      metadata: { 
        type: 'generic',
        chunk_index: Math.floor(i / maxLength),
        ...metadata
      }
    });
  }
  
  return sections;
}

async function generateEmbedding(text: string) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }

  const response = await fetch('https://api.openai.com/v1/embeddings', {
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

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenAI API error details:', errorText);
    throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}
