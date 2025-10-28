import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const redirectTo = requestUrl.searchParams.get('next') || '/signin'

  const response = NextResponse.redirect(new URL(redirectTo, requestUrl))

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookies) {
          cookies.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      return NextResponse.redirect(new URL('/signin?error=oauth_callback', requestUrl))
    }

    // Ensure a basic profile exists so middleware doesn't block onboarding
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      // Derive names from metadata/identities
      const meta: Record<string, unknown> = (user.user_metadata || {}) as Record<string, unknown>
      const identities = (user.identities as any[]) || []
      const identityData = identities[0]?.identity_data || {}

      const rawFirst = (meta.first_name as string) || (identityData.given_name as string) || (identityData.first_name as string) || (meta.given_name as string) || ""
      const rawLast = (meta.last_name as string) || (identityData.family_name as string) || (identityData.last_name as string) || (meta.family_name as string) || ""
      const rawFull = (meta.full_name as string) || (meta.name as string) || (identityData.name as string) || ""

      let derivedFirst = rawFirst?.trim()
      let derivedLast = rawLast?.trim()
      if (!derivedFirst && !derivedLast && rawFull) {
        const parts = rawFull.trim().split(/\s+/)
        derivedFirst = parts[0] || ""
        derivedLast = parts.slice(1).join(" ") || ""
      }

      const firstName = derivedFirst || null
      const lastName = derivedLast || null

      // Preserve existing role; only set role on first insert
      const { data: existing } = await supabase
        .from('profiles')
        .select('id, role, first_name, last_name, email')
        .eq('id', user.id)
        .maybeSingle()

      if (existing) {
        // Upsert with non-null name values, preserving existing non-null fields
        await supabase
          .from('profiles')
          .upsert(
            {
              id: user.id,
              email: user.email ?? existing.email ?? null,
              first_name: firstName ?? existing.first_name ?? null,
              last_name: lastName ?? existing.last_name ?? null,
            },
            { onConflict: 'id' }
          )
      } else {
        // First-time insert with default user role and names if available
        await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            role: 'user',
            first_name: firstName,
            last_name: lastName,
          })
      }
    }
  }

  return response
}


