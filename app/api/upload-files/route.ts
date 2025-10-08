import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const ALLOWED_MIME = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/octet-stream',
])

async function bufferFromFile(f: File): Promise<Buffer> {
  const ab = await f.arrayBuffer()
  return Buffer.from(ab)
}

async function extractPdfText(buf: Buffer): Promise<{ text: string; pages?: number }> {
  if (!buf || buf.length === 0) {
    throw new Error('PDF buffer is empty')
  }
  try {
    const mod: any = await import('pdf-parse')
    const pdfParse = mod.default || mod
    const res = await pdfParse(buf)
    return { text: res.text || '', pages: (res as any).numpages }
  } catch (e: any) {
    // Fallback: pdf2json (pure Node, stable import)
    const { default: PDFParser } = await import('pdf2json') as any
    const parser = new PDFParser(null, 0)
    const result = await new Promise<{ text: string; pages: number }>((resolve, reject) => {
      parser.on('pdfParser_dataError', (err: any) => reject(new Error(err?.parserError || 'pdf2json error')))
      parser.on('pdfParser_dataReady', (pdfData: any) => {
        try {
          const pages = Array.isArray(pdfData?.Pages) ? pdfData.Pages.length : 0
          const text = (pdfData?.Pages || [])
            .map((p: any) =>
              (p?.Texts || [])
                .map((t: any) => decodeURIComponent((t?.R || []).map((r: any) => r?.T || '').join('')))
                .join(' ')
            )
            .join('\n\n')
          resolve({ text, pages })
        } catch (err: any) {
          reject(err)
        }
      })
      parser.parseBuffer(buf)
    })
    return result
  }
}

async function extractDocxText(buf: Buffer): Promise<string> {
  const mod: any = await import('mammoth')
  const mammoth = mod.default || mod
  const res = await mammoth.extractRawText({ buffer: buf })
  return res.value || ''
}

export async function POST(req: NextRequest) {
  try {
    // Authenticate with Bearer token like other routes
    const url = process.env.SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceKey) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
    }
    const supabaseAdmin = createClient(url, serviceKey)

    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const accessToken = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userErr } = await supabaseAdmin.auth.getUser(accessToken)
    if (userErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
    const files = formData.getAll('files').filter(Boolean) as File[]
    if (!files.length) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 })
    }
    if (files.length > 5) {
      return NextResponse.json({ error: 'Too many files. Max 5.' }, { status: 400 })
    }

    const sourceType = 'files'
    const sourceName = 'uploaded_files'

    const { data: existingSource, error: srcFetchErr } = await supabaseAdmin
      .from('content_sources')
      .select('id')
      .eq('user_id', user.id)
      .eq('source_type', sourceType)
      .eq('source_name', sourceName)
      .maybeSingle()

    if (srcFetchErr) {
      return NextResponse.json({ error: srcFetchErr.message }, { status: 500 })
    }

    let sourceId = existingSource?.id as number | undefined
    if (!sourceId) {
      const { data: newSource, error: srcInsertErr } = await supabaseAdmin
        .from('content_sources')
        .insert({
          user_id: user.id,
          source_type: sourceType,
          source_name: sourceName,
          config: {},
        })
        .select('id')
        .single()
      if (srcInsertErr) {
        return NextResponse.json({ error: srcInsertErr.message }, { status: 500 })
      }
      sourceId = newSource.id
    }

    const insertedIds: number[] = []
    const results: Array<{ name: string; ok: boolean; message?: string }> = []

    for (const file of files) {
      const name = file.name || 'file'
      let type = file.type
      // Fallback to extension when browser doesn't set MIME
      if (!type) {
        const lower = name.toLowerCase()
        if (lower.endsWith('.pdf')) type = 'application/pdf'
        if (lower.endsWith('.docx')) type = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      }
      const size = file.size

      if (!type || (!ALLOWED_MIME.has(type) && !/\.pdf$|\.docx$/i.test(name))) {
        results.push({ name, ok: false, message: 'Unsupported file type' })
        continue
      }
      if (size <= 0 || size > MAX_FILE_SIZE) {
        results.push({ name, ok: false, message: 'File too large (max 10 MB)' })
        continue
      }

      try {
        const buf = await bufferFromFile(file)
        if (!buf || buf.length === 0) {
          results.push({ name, ok: false, message: 'Uploaded file read as empty buffer' })
          continue
        }

        let text = ''
        let pages: number | undefined
        if (type === 'application/pdf' || /\.pdf$/i.test(name)) {
          const out = await extractPdfText(buf)
          text = out.text
          pages = out.pages
        } else if (type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || /\.docx$/i.test(name)) {
          text = await extractDocxText(buf)
        }

        const cleaned = (text || '').trim()
        if (!cleaned) {
          results.push({ name, ok: false, message: 'No extractable text (length 0)' })
          continue
        }

        const { data: raw, error: rawErr } = await supabaseAdmin
          .from('raw_content')
          .insert({
            source_id: sourceId,
            title: 'Files',
            content: cleaned,
            metadata: {
              filename: name,
              mime_type: type,
              size,
              pages,
              uploaded_at: new Date().toISOString(),
            },
          })
          .select('id')
          .single()

        if (rawErr) {
          console.error('raw_content insert error', rawErr)
          results.push({ name, ok: false, message: rawErr.message })
          continue
        }

        try {
          const { processRawDocument } = await import('@/lib/processRaw')
          await processRawDocument(raw.id)
        } catch (e) {
          console.error('Failed processing uploaded file', e)
        }

        insertedIds.push(raw.id)
        results.push({ name, ok: true, message: `parsed ${cleaned.length} chars` })
      } catch (e: any) {
        results.push({ name, ok: false, message: e?.message || 'Failed to process file' })
      }
    }

    const okCount = results.filter(r => r.ok).length
    return NextResponse.json({
      success: true,
      inserted: okCount,
      total: files.length,
      details: results,
      document_ids: insertedIds,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 })
  }
}


