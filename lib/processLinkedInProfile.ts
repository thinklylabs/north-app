import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js'
import { processRawDocument } from '@/lib/processRaw'

type LinkedInProfileRow = {
  id: number
  user_id: string | null
  account_id: string | null
  identifier: string | null
  profile_json: any
}

function cleanText(value: unknown): string {
  const text = String(value ?? '')
  // Normalize newlines and tabs, but preserve line breaks for readability
  const withNewlines = text
    .replace(/\r/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/https?:\/\/\S+/g, '')

  const lines = withNewlines.split(/\n+/).map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean)
  return lines.join('\n')
}

function pickString(obj: any, keys: string[], fallback: string = ''): string {
  for (const k of keys) {
    const v = obj?.[k]
    if (typeof v === 'string' && v.trim()) return v
  }
  return fallback
}

function formatNameLike(value: any): string {
  if (!value) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'object') {
    // Common name carriers
    return (
      value.name || value.title || value.skill || value.text || value.label || ''
    ) as string
  }
  return String(value)
}

function normalizeStringArray(arr: any[], mapItem?: (v: any) => string): string[] {
  const out: string[] = []
  for (const item of arr || []) {
    const s = mapItem ? mapItem(item) : (typeof item === 'string' ? item : formatNameLike(item))
    const cleaned = String(s || '').trim()
    if (cleaned) out.push(cleaned)
  }
  return out
}

function extractRelevantText(profile: any): { text: string; meta: Record<string, any> } {
  if (!profile || typeof profile !== 'object') return { text: '', meta: {} }

  const lines: string[] = []

  // Identity
  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim()
  if (fullName) {
    lines.push(fullName)
  }
  if (typeof profile?.headline === 'string') {
    lines.push(profile.headline)
  }
  if (typeof profile?.summary === 'string') {
    lines.push(profile.summary)
  }
  if (typeof profile?.about === 'string') {
    lines.push(profile.about)
  }

  // Experience (support multiple possible shapes: work_experience, experiences, positions)
  const experiencesRaw = Array.isArray(profile?.work_experience)
    ? profile.work_experience
    : (Array.isArray(profile?.experiences)
      ? profile.experiences
      : (Array.isArray(profile?.positions) ? profile.positions : []))
  if (experiencesRaw.length) lines.push('Experience:')
  for (const exp of experiencesRaw) {
    const title = pickString(exp, ['position', 'title'])
    const company = typeof exp?.company === 'string' ? exp.company : pickString(exp?.company, ['name'])
    const location = pickString(exp, ['location', 'location_name'])
    const start = pickString(exp, ['start', 'from'])
    const end = pickString(exp, ['end', 'to'])
    const range = (start || end) ? `${start || ''} – ${end || 'present'}`.replace(/\s+–\s+present$/, ' – present') : pickString(exp, ['date_range', 'period'])
    const roleLine = [title, company, location, range].filter(Boolean).join(' · ')
    if (roleLine) lines.push(`- ${roleLine}`)
    if (typeof exp?.description === 'string' && exp.description.trim()) lines.push(`  ${exp.description.trim()}`)
    const expSkills = Array.isArray(exp?.skills) ? exp.skills : []
    if (expSkills.length) {
      const expSkillNames = normalizeStringArray(expSkills)
      if (expSkillNames.length) lines.push(`  Skills: ${expSkillNames.join(', ')}`)
    }
  }

  // Education
  const education = Array.isArray(profile?.education) ? profile.education : []
  if (education.length) lines.push('Education:')
  for (const edu of education) {
    const school = typeof edu?.school === 'string' ? edu.school : pickString(edu?.school, ['name'])
    const degree = pickString(edu, ['degree', 'degree_name'])
    const field = pickString(edu, ['field_of_study', 'field'])
    const start = pickString(edu, ['start', 'from'])
    const end = pickString(edu, ['end', 'to'])
    const range = (start || end) ? `${start || ''} – ${end || ''}` : pickString(edu, ['date_range', 'period', 'dates'])
    const eduLine = [school, degree, field, range].filter(Boolean).join(' · ')
    if (eduLine) lines.push(`- ${eduLine}`)
    if (typeof edu?.description === 'string' && edu.description.trim()) lines.push(`  ${edu.description.trim()}`)
  }

  // Certifications / Licenses
  const certs = Array.isArray(profile?.certifications) ? profile.certifications : []
  if (certs.length) lines.push('Certifications:')
  for (const c of certs) {
    const name = pickString(c, ['name', 'title'])
    const issuer = pickString(c, ['authority', 'issuer'])
    const lic = pickString(c, ['license_number', 'license'])
    const certLine = [name, issuer, lic].filter(Boolean).join(' · ')
    if (certLine) lines.push(`- ${certLine}`)
  }

  // Skills
  const skills = Array.isArray(profile?.skills) ? profile.skills : []
  if (skills.length > 0) {
    const normalized = normalizeStringArray(skills, (s) => formatNameLike(s))
    if (normalized.length > 0) {
      lines.push(`Skills: ${normalized.join(', ')}`)
    }
  }

  // Publications, Projects, Honors
  const publications = Array.isArray(profile?.publications) ? profile.publications : []
  if (publications.length) lines.push('Publications:')
  for (const p of publications) {
    if (typeof p?.title === 'string') lines.push(`- ${p.title}`)
    if (typeof p?.description === 'string') lines.push(`  ${p.description}`)
  }
  const projects = Array.isArray(profile?.projects) ? profile.projects : []
  if (projects.length) lines.push('Projects:')
  for (const p of projects) {
    if (typeof p?.title === 'string') lines.push(`- ${p.title}`)
    if (typeof p?.description === 'string') lines.push(`  ${p.description}`)
  }
  const honors = Array.isArray(profile?.honors) ? profile.honors : []
  if (honors.length) lines.push('Honors & Awards:')
  for (const h of honors) {
    if (typeof h?.title === 'string') lines.push(`- ${h.title}`)
    if (typeof h?.description === 'string') lines.push(`  ${h.description}`)
  }

  // Sections fallback
  const sections = Array.isArray(profile?.sections) ? profile.sections : []
  for (const sec of sections) {
    if (typeof sec?.title === 'string') lines.push(sec.title)
    if (typeof sec?.text === 'string') lines.push(sec.text)
    if (Array.isArray(sec?.items)) {
      for (const it of sec.items) {
        if (typeof it?.title === 'string') lines.push(it.title)
        if (typeof it?.description === 'string') lines.push(it.description)
      }
    }
  }

  const cleaned = cleanText(lines.filter(Boolean).join('\n'))
  const meta = {
    type: 'linkedin_profile',
    provider_id: profile?.provider_id ?? null,
    identifier: profile?.public_identifier ?? profile?.identifier ?? null,
    first_name: profile?.first_name ?? null,
    last_name: profile?.last_name ?? null,
    headline: profile?.headline ?? null,
  }
  return { text: cleaned, meta }
}

export async function processLinkedInProfile(rowId: number): Promise<{ sectionsCreated: number }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing Supabase admin environment variables')

  const supabase = createSupabaseAdminClient(url, key)

  const { data: row, error } = await supabase
    .from('linkedin_profile_json')
    .select('id, user_id, account_id, identifier, profile_json')
    .eq('id', rowId)
    .maybeSingle<LinkedInProfileRow>()
  if (error) throw error
  if (!row) throw new Error('linkedin_profile_json row not found')

  const { text, meta } = extractRelevantText(row.profile_json)
  if (!text) return { sectionsCreated: 0 }

  // Ensure a content_source exists for this user and linkedin profile
  const sourceType = 'linkedin_profile'
  const sourceName = `linkedin_profile:${meta.identifier || row.identifier || 'unknown'}`

  const { data: existingSource, error: sourceFetchError } = await supabase
    .from('content_sources')
    .select('id')
    .eq('user_id', row.user_id)
    .eq('source_type', sourceType)
    .eq('source_name', sourceName)
    .maybeSingle()
  if (sourceFetchError) throw sourceFetchError

  let sourceId = existingSource?.id as number | undefined
  if (!sourceId) {
    const { data: newSource, error: insertSourceError } = await supabase
      .from('content_sources')
      .insert({
        user_id: row.user_id,
        source_type: sourceType,
        source_name: sourceName,
        config: { account_id: row.account_id, identifier: row.identifier }
      })
      .select('id')
      .single()
    if (insertSourceError) throw insertSourceError
    sourceId = newSource.id
  }

  // Insert as a raw_content document, then reuse the standard pipeline
  const { data: raw, error: rawInsertError } = await supabase
    .from('raw_content')
    .insert({
      source_id: sourceId,
      title: 'LinkedIn Profile',
      content: text,
      metadata: {
        ...meta,
        account_id: row.account_id,
        identifier: row.identifier,
        source_row: { table: 'linkedin_profile_json', id: row.id }
      }
    })
    .select('id')
    .single()
  if (rawInsertError) throw rawInsertError

  const result = await processRawDocument(raw.id)
  return { sectionsCreated: result.sectionsCreated }
}


