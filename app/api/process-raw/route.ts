import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { processRawDocument } from '@/lib/processRaw'

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url) throw new Error('Missing SUPABASE_URL environment variable')
  if (!serviceKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable')
  return createClient(url, serviceKey)
}

export async function POST(req: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const body = await req.json().catch(() => ({})) as { document_id?: number; all?: boolean; limit?: number }

    if (typeof body.document_id === 'number') {
      const result = await processRawDocument(body.document_id)
      return NextResponse.json({ ok: true, document_id: body.document_id, sections_created: result.sectionsCreated })
    }

    if (body.all) {
      const limit = typeof body.limit === 'number' && body.limit > 0 ? body.limit : 50
      const { data: raws, error } = await supabaseAdmin
        .from('raw_content')
        .select('id')
        .is('processed_at', null)
        .order('created_at', { ascending: true })
        .limit(limit)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      let documentsProcessed = 0
      let totalSections = 0
      for (const row of raws || []) {
        const r = await processRawDocument(row.id)
        documentsProcessed += 1
        totalSections += r.sectionsCreated
      }

      return NextResponse.json({ ok: true, documents_processed: documentsProcessed, sections_created: totalSections })
    }

    return NextResponse.json({ error: 'Provide { document_id } or { all: true }' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 })
  }
}


