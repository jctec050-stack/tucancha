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

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  // 1. Redirect authenticated users away from auth pages
  if (user) {
    if (path.startsWith('/login') || path.startsWith('/register')) {
      const role = user.user_metadata?.role || 'PLAYER'
      let redirectUrl = '/'
      
      if (role === 'ADMIN') {
        redirectUrl = '/admin/dashboard'
      } else if (role === 'OWNER') {
        redirectUrl = '/dashboard'
      }
      
      const redirectResponse = NextResponse.redirect(new URL(redirectUrl, request.url))
      // Copy cookies from response (which might have refreshed tokens) to redirectResponse
      // Note: This is crucial for keeping the session valid after redirect
      const setCookieHeader = response.headers.get('set-cookie')
      if (setCookieHeader) {
         redirectResponse.headers.set('set-cookie', setCookieHeader)
      }
      return redirectResponse
    }
  }

  // 2. Protect Admin Routes
  if (path.startsWith('/admin')) {
    if (!user) {
      const redirectResponse = NextResponse.redirect(new URL('/login', request.url))
      return redirectResponse
    }
    const role = user.user_metadata?.role
    if (role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // 3. Protect Owner Dashboard Routes
  if (path.startsWith('/dashboard')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    const role = user.user_metadata?.role
    if (role !== 'OWNER' && role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // 4. Protect Player Routes (My Bookings)
  if (path.startsWith('/bookings')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
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
     * - logo.png (public images)
     * - icon.png
     * - version.json
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|logo.png|icon.png|version.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
