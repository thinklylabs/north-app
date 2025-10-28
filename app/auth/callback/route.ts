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
      // Preserve existing role; only set role on first insert
      const { data: existing } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('id', user.id)
        .maybeSingle()

      if (existing) {
        // Update email without touching role
        await supabase
          .from('profiles')
          .upsert(
            {
              id: user.id,
              email: user.email,
            },
            { onConflict: 'id' }
          )
      } else {
        // First-time insert with default user role
        await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            role: 'user',
          })
      }
    }
  }

  return response
}


