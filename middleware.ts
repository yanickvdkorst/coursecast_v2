import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Required for session refresh — do not remove
  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  const isAuthRoute =
    pathname === '/sign-in' ||
    pathname === '/sign-up' ||
    pathname === '/forgot-password' ||
    pathname === '/reset-password' ||
    pathname === '/join' ||
    pathname.startsWith('/watch/') ||
    pathname.startsWith('/t/') ||
    pathname.startsWith('/auth/')

  // Unauthenticated → sign-in (remember where they were heading)
  if (!user && !isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/sign-in'
    if (pathname !== '/' && pathname !== '/dashboard') url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  // Authenticated on sign-in/up → dashboard
  if (user && !user.is_anonymous && (pathname === '/sign-in' || pathname === '/sign-up')) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // Guest (anonymous) users can only reach their match, the join flow, and the
  // upgrade page — everything else funnels them to create a real account.
  if (user?.is_anonymous) {
    const allowed =
      pathname.startsWith('/matches') ||
      pathname.startsWith('/guest') ||
      pathname === '/join' ||
      pathname.startsWith('/watch/') ||
      pathname.startsWith('/t/') ||
      pathname.startsWith('/auth/')
    if (!allowed) {
      const url = request.nextUrl.clone()
      url.pathname = '/guest/upgrade'
      return NextResponse.redirect(url)
    }
  }

  // Admin-only routes — single DB call, only for /admin/*
  if (pathname.startsWith('/admin') && user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  // Exclude Next internals, image files, and the public PWA files (service
  // worker, manifest, offline page) so they're never redirected to /sign-in.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|sw.js|offline.html|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|webmanifest)$).*)'],
}
