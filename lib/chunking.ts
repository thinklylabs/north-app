type SourceType = 'thoughts' | 'slack_messages' | 'substack_feeds' | 'files' | 'notion' | 'tldv'

export interface Chunk {
  content: string
  metadata: Record<string, any>
}

export function chunkBySourceType(
  content: string,
  sourceType: SourceType,
  metadata: any
): Chunk[] {
  switch (sourceType) {
    case 'slack_messages':
      return chunkSlackMessage(content, metadata)
    case 'substack_feeds':
      return chunkGeneric(content, metadata, {
        type: 'substack_feed',
        url: metadata?.url,
      })
    case 'notion':
      return chunkGeneric(content, metadata, {
        type: 'notion',
        connection_id: metadata?.connection_id,
        workspace: metadata?.workspace,
      })
    case 'files':
      return chunkGeneric(content, metadata, {
        type: 'file',
        filename: metadata?.filename,
        mime_type: metadata?.mime_type,
      })
    case 'tldv':
      return chunkTldvTranscript(content, metadata)
    case 'thoughts':
    default:
      return chunkGeneric(content, metadata, {
        type: 'thoughts',
        title: metadata?.title,
        date: metadata?.date,
      })
  }
}

function chunkSlackMessage(content: string, metadata: any): Chunk[] {
  const trimmed = (content || '').trim()
  if (!trimmed) return []
  return [
    {
      content: trimmed,
      metadata: {
        type: 'slack_message',
        connection_id: metadata?.connection_id,
        channel_id: metadata?.channel_id,
        channel_name: metadata?.channel_name,
        slack_ts: metadata?.slack_ts,
        chunk_index: 0,
      },
    },
  ]
}

function chunkGeneric(
  content: string,
  metadata: any,
  baseMeta: Record<string, any>,
  maxLen: number = 2000,
  overlap: number = 200
): Chunk[] {
  const text = (content || '').trim()
  if (!text) return []

  const chunks: Chunk[] = []
  let start = 0
  let index = 0
  while (start < text.length) {
    const end = Math.min(start + maxLen, text.length)
    const slice = text.slice(start, end)
    chunks.push({
      content: slice,
      metadata: {
        ...baseMeta,
        chunk_index: index,
        ...(metadata || {}),
      },
    })
    if (end === text.length) break
    start = Math.max(0, end - overlap)
    index += 1
  }
  return chunks
}

function chunkTldvTranscript(content: string, metadata: any): Chunk[] {
  const trimmed = (content || '').trim()
  if (!trimmed) return []
  
  // For tl;dv, we'll chunk by speaker segments to maintain context
  const segments = metadata?.segments || []
  if (segments.length === 0) {
    // Fallback to generic chunking if no segments
    return chunkGeneric(content, metadata, {
      type: 'tldv_transcript',
      meeting_id: metadata?.meeting_id,
      meeting_name: metadata?.meeting_name,
      chunk_index: 0,
    })
  }

  const chunks: Chunk[] = []
  let currentChunk = ''
  let chunkIndex = 0
  const maxChunkSize = 2000
  const overlap = 200

  for (const segment of segments) {
    const segmentText = `${segment.speaker}: ${segment.text}\n`
    
    if (currentChunk.length + segmentText.length > maxChunkSize && currentChunk.length > 0) {
      chunks.push({
        content: currentChunk.trim(),
        metadata: {
          type: 'tldv_transcript',
          meeting_id: metadata?.meeting_id,
          meeting_name: metadata?.meeting_name,
          chunk_index: chunkIndex,
          start_time: segments[chunkIndex * 10]?.startTime || 0,
          end_time: segments[Math.min((chunkIndex + 1) * 10 - 1, segments.length - 1)]?.endTime || 0,
        },
      })
      currentChunk = segmentText
      chunkIndex++
    } else {
      currentChunk += segmentText
    }
  }

  if (currentChunk.trim()) {
    chunks.push({
      content: currentChunk.trim(),
      metadata: {
        type: 'tldv_transcript',
        meeting_id: metadata?.meeting_id,
        meeting_name: metadata?.meeting_name,
        chunk_index: chunkIndex,
        start_time: segments[chunkIndex * 10]?.startTime || 0,
        end_time: segments[segments.length - 1]?.endTime || 0,
      },
    })
  }

  return chunks
}


