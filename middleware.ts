import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const url = request.nextUrl.clone()

  // 1. Protect Dashboard Routes (Owners)
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    if (!user) {
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }
    
    // Check role from metadata if possible, or fetch profile (though middleware fetch is expensive)
    // For now, basic auth check is a huge improvement. 
    // Optimization: Store role in user_metadata upon signup/login to avoid DB calls here.
    const role = user.user_metadata?.role;
    if (role && role !== 'OWNER') {
         // If logged in but not owner, redirect to home
         url.pathname = '/'
         return NextResponse.redirect(url)
    }
  }

  // 2. Protect Admin Routes
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!user) {
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }
     const role = user.user_metadata?.role;
     if (role && role !== 'ADMIN') {
         url.pathname = '/'
         return NextResponse.redirect(url)
    }
  }
  
  // 4. Redirect Authenticated Users away from Login/Register
  if (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/register') {
      if (user) {
          const role = user.user_metadata?.role;
          if (role === 'ADMIN') {
              url.pathname = '/admin/dashboard';
          } else if (role === 'OWNER') {
              url.pathname = '/dashboard';
          } else {
              url.pathname = '/search'; // Or home '/'
          }
          return NextResponse.redirect(url)
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
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
