import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { ROLES } from '@/lib/roles'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip middleware for static files, API routes, and auth pages
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/signin') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/reset-password') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  // If no user, redirect to signin
  if (error || !user) {
    if (pathname !== '/signin') {
      return NextResponse.redirect(new URL('/signin', request.url))
    }
    return NextResponse.next()
  }

  // Get user profile to check role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile) {
    // If no profile exists, redirect to signin
    return NextResponse.redirect(new URL('/signin', request.url))
  }

  // Role-based routing with proper enum values
  if (profile.role === ROLES.ADMIN) {
    // Admin users should be redirected to /admin if they try to access /dashboard
    if (pathname === '/dashboard' || pathname === '/') {
      return NextResponse.redirect(new URL('/admin', request.url))
    }
  } else if (profile.role === ROLES.USER) {
    // Regular users should be redirected to /dashboard if they try to access /admin
    if (pathname === '/admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    // Redirect root to dashboard for users
    if (pathname === '/') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return NextResponse.next()
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


