type SourceType = 'thoughts' | 'slack_messages' | 'substack_feeds' | 'files' | 'notion'

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


