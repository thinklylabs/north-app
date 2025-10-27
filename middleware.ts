import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { ROLES } from '@/lib/roles'
import { checkUserReadiness } from '@/lib/userReadiness'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const response = NextResponse.next()

  // Skip middleware for static files, API routes, and auth pages
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/signin') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/reset-password') ||
    pathname.startsWith('/waiting') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { user }, error } = await supabase.auth.getUser()

  // If no user, redirect to signin
  if (error || !user) {
    if (pathname !== '/signin') {
      return NextResponse.redirect(new URL('/signin', request.url))
    }
    return response
  }

  // Get user profile to check role and onboarding status
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, website_url, company_name, icp, icp_pain_points')
    .eq('id', user.id)
    .single()

  if (!profile) {
    // If no profile exists yet, allow onboarding to create it
    if (pathname !== '/onboarding') {
      return NextResponse.redirect(new URL('/onboarding', request.url))
    }
    return response
  }

  // Determine if user has completed onboarding (one-time)
  const isOnboarded = !!(
    (profile as any)?.website_url &&
    (profile as any)?.company_name &&
    (profile as any)?.icp &&
    (profile as any)?.icp_pain_points
  )

  // If user tries to access onboarding again after completion, send them to dashboard
  if (pathname === '/onboarding' && isOnboarded) {
    return NextResponse.redirect(new URL('/users/dashboard', request.url))
  }

  // Role-based routing with comprehensive path protection
  if (profile.role === ROLES.ADMIN) {
    // Admin users: Block access to ALL user routes and redirect to admin dashboard
    if (pathname.startsWith('/users/') || pathname === '/dashboard' || pathname === '/') {
      return NextResponse.redirect(new URL('/admin', request.url))
    }
  } else if (profile.role === ROLES.USER) {
    const isUserRoot = pathname.startsWith('/users/') || pathname === '/dashboard' || pathname === '/'

    // Force users who haven't completed onboarding to onboarding page when accessing user routes
    if (!isOnboarded && isUserRoot) {
      return NextResponse.redirect(new URL('/onboarding', request.url))
    }

    // Check if user is ready before allowing access to user routes
    if (isUserRoot) {
      const readinessStatus = await checkUserReadiness(user.id)
      if (!readinessStatus.isReady) {
        // Redirect to waiting page
        return NextResponse.redirect(new URL('/waiting', request.url))
      }
    }
    
    // Regular users: Block access to ALL admin routes and redirect to user dashboard
    if (pathname.startsWith('/admin/') || pathname === '/admin') {
      return NextResponse.redirect(new URL('/users/dashboard', request.url))
    }
    // Redirect root and old dashboard paths to users/dashboard for users
    if (pathname === '/' || pathname === '/dashboard') {
      return NextResponse.redirect(new URL('/users/dashboard', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}


