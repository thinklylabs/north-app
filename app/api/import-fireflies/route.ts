import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url) throw new Error('Missing SUPABASE_URL environment variable')
  if (!serviceKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable')
  return createClient(url, serviceKey)
}

async function firefliesGraphQL<T>(apiKey: string, query: string, variables: Record<string, any> = {}) {
  const res = await fetch('https://api.fireflies.ai/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'x-api-key': apiKey,
    },
    body: JSON.stringify({ query, variables }),
  })

  const data = await res.json()
  if (!res.ok || data?.errors?.length) {
    const msg = data?.errors?.[0]?.message || `Fireflies error (${res.status})`
    throw new Error(msg)
  }
  return data.data as T
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

    // 1) Verify API key
    const verifyQuery = `query { user { name email } }`
    const verify = await firefliesGraphQL<{ user: { name?: string; email?: string } | null }>(cleanedKey, verifyQuery)
    if (!verify.user) {
      return NextResponse.json({ error: 'Invalid Fireflies API key' }, { status: 400 })
    }

    // 2) Paginate transcripts
    const transcriptsQuery = `
      query Transcripts($fromDate: DateTime, $toDate: DateTime, $limit: Int, $skip: Int) {
        transcripts(fromDate: $fromDate, toDate: $toDate, limit: $limit, skip: $skip) {
          id
          title
          date
          duration
          transcript_url
          audio_url
          video_url
        }
      }
    `
    const fromDate = '2010-01-01T00:00:00Z'
    const toDate = new Date().toISOString()
    const limit = 50
    let skip = 0
    const allTranscripts: any[] = []

    while (true) {
      const data = await firefliesGraphQL<{ transcripts: any[] }>(cleanedKey, transcriptsQuery, {
        fromDate, toDate, limit, skip,
      })
      const page = data?.transcripts ?? []
      if (page.length === 0) break
      allTranscripts.push(...page)
      skip += limit
      await new Promise((r) => setTimeout(r, 500))
    }

    if (allTranscripts.length === 0) {
      return NextResponse.json({ message: 'No transcripts found. Nothing imported.' })
    }

    // 3) Fetch each transcript details and upsert
    const transcriptDetailQuery = `
      query Transcript($transcriptId: String!) {
        transcript(id: $transcriptId) {
          speakers { id name }
          summary {
            keywords
            action_items
            outline
            shorthand_bullet
            overview
            bullet_gist
            gist
            short_summary
            short_overview
            meeting_type
            topics_discussed
            transcript_chapters
          }
          sentences {
            index
            speaker_name
            speaker_id
            text
            raw_text
            start_time
            end_time
            ai_filters {
              task
              pricing
              metric
              question
              date_and_time
              text_cleanup
              sentiment
            }
          }
        }
      }
    `

    for (const meta of allTranscripts) {
      const detail = await firefliesGraphQL<{ transcript: any }>(cleanedKey, transcriptDetailQuery, {
        transcriptId: meta.id,
      })

      const row = {
        user_id: user.id,
        transcript_id: meta.id,
        title: meta.title,
        date: meta.date ? new Date(meta.date).toISOString() : null,
        duration: meta.duration ?? null,
        transcript_url: meta.transcript_url ?? null,
        audio_url: meta.audio_url ?? null,
        video_url: meta.video_url ?? null,
        speakers: detail.transcript?.speakers ?? [],
        summary: detail.transcript?.summary ?? {},
        sentences: detail.transcript?.sentences ?? [],
      }

      const { error: upsertErr } = await supabaseAdmin
        .from('user_transcripts')
        .upsert(row, { onConflict: 'user_id,transcript_id' })

      if (upsertErr) {
        throw new Error(`DB upsert failed for ${meta.id}: ${upsertErr.message}`)
      }

      await new Promise((r) => setTimeout(r, 250))
    }

    return NextResponse.json({
      message: `Imported ${allTranscripts.length} transcripts successfully.`,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}


