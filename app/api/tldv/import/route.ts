import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url) throw new Error('Missing SUPABASE_URL environment variable')
  if (!serviceKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable')
  return createClient(url, serviceKey)
}

async function tldvApiCall<T>(apiKey: string, endpoint: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`https://pasta.tldv.io${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      ...options.headers,
    },
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(errorData.error || `tl;dv API error (${res.status})`)
  }

  return res.json()
}

export async function POST(req: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { apiKey } = await req.json()
    const cleanedKey = typeof apiKey === 'string' ? apiKey.trim() : ''
    if (!cleanedKey) {
      return NextResponse.json({ error: 'Missing apiKey' }, { status: 400 })
    }

    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const accessToken = authHeader.replace('Bearer ', '')

    const { data: { user }, error: userErr } = await supabaseAdmin.auth.getUser(accessToken)
    if (userErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 1) Verify API key with health check
    try {
      await tldvApiCall(cleanedKey, '/v1alpha1/health')
    } catch (error) {
      return NextResponse.json({ error: 'Invalid tl;dv API key' }, { status: 400 })
    }

    // 2) Get all meetings
    const meetings = await tldvApiCall<{
      results: Array<{
        id: string
        name: string
        happenedAt: string
        duration: number
        organizer: { name: string; email: string }
        invitees: Array<{ name: string; email: string }>
      }>
    }>(cleanedKey, '/v1alpha1/meetings')

    if (meetings.results.length === 0) {
      return NextResponse.json({ message: 'No meetings found. Nothing imported.' })
    }

    // 3) Create content source for tl;dv
    const sourceType = 'tldv'  // This goes in content_sources.source_type
    const sourceName = 'tldv_meetings'  // This goes in content_sources.source_name

    const { data: existingSource } = await supabaseAdmin
      .from('content_sources')
      .select('id')
      .eq('user_id', user.id)
      .eq('source_type', sourceType)  // 'tldv'
      .eq('source_name', sourceName)   // 'tldv_meetings'
      .maybeSingle()

    let sourceId = existingSource?.id as number | undefined
    if (!sourceId) {
      const { data: newSource, error: sourceInsertError } = await supabaseAdmin
        .from('content_sources')
        .insert({
          user_id: user.id,
          source_type: sourceType,  // 'tldv'
          source_name: sourceName,  // 'tldv_meetings'
          config: { api_key_configured: true }
        })
        .select('id')
        .single()
      
      if (sourceInsertError) {
        throw new Error(`Failed to create content source: ${sourceInsertError.message}`)
      }
      sourceId = newSource.id
    }

    // 4) Process each meeting
    const rawContentRows: any[] = []
    
    for (const meeting of meetings.results) {
      try {
        // Get transcript for this meeting
        const transcript = await tldvApiCall<{
          id: string
          meetingId: string
          data: Array<{
            speaker: string
            text: string
            startTime: number
            endTime: number
          }>
        }>(cleanedKey, `/v1alpha1/meetings/${meeting.id}/transcript`)

        if (!transcript.data || transcript.data.length === 0) {
          console.log(`No transcript available for meeting ${meeting.id}`)
          continue
        }

        // Combine transcript into readable text
        const transcriptText = transcript.data
          .map(segment => `${segment.speaker}: ${segment.text}`)
          .join('\n')

        rawContentRows.push({
          source_id: sourceId,
          title: 'tl;dv',  // This goes in raw_content.title
          content: transcriptText,  // This goes in raw_content.content
          metadata: {
            provider: 'tldv',
            meeting_id: meeting.id,
            meeting_name: meeting.name,  // Meeting name goes in metadata
            happened_at: meeting.happenedAt,
            duration: meeting.duration,
            organizer: meeting.organizer,
            invitees: meeting.invitees,
            segments: transcript.data,
          }
        })

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (error) {
        console.error(`Failed to process meeting ${meeting.id}:`, error)
        continue
      }
    }

    if (rawContentRows.length === 0) {
      return NextResponse.json({ message: 'No transcripts found. Nothing imported.' })
    }

    // 5) Insert raw_content rows
    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('raw_content')
      .insert(rawContentRows)
      .select('id')

    if (insertError) {
      console.error('Error inserting raw_content:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // 6) Process inserted rows into document_sections
    try {
      const { processRawDocument } = await import('@/lib/processRaw')
      for (const row of inserted || []) {
        await processRawDocument(row.id)
      }
    } catch (e) {
      console.error('Failed to process some tl;dv raw documents', e)
    }

    return NextResponse.json({
      success: true,
      message: `Imported ${rawContentRows.length} meeting transcripts successfully.`,
      meetingCount: rawContentRows.length
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}
