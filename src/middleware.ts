import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { isAuthorized, isAuthEnabled } from '@/lib/auth'

export function middleware(req: NextRequest) {
  if (!isAuthEnabled()) return NextResponse.next()

  const { pathname } = req.nextUrl
  const method = req.method

  const publicPaths = pathname === '/login' || pathname.startsWith('/api/auth') || pathname === '/api/health'
  if (publicPaths) return NextResponse.next()

  const protectPage = pathname.startsWith('/admin')
  const protectApi =
    (pathname === '/api/seed' && method === 'POST') ||
    (pathname === '/api/avec/sync' && method === 'POST')

  if (!protectPage && !protectApi) return NextResponse.next()

  if (isAuthorized(req)) return NextResponse.next()

  if (protectPage) {
    const login = new URL('/login', req.url)
    login.searchParams.set('next', pathname)
    return NextResponse.redirect(login)
  }

  return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
}

export const config = {
  matcher: ['/admin/:path*', '/api/seed', '/api/avec/sync'],
}
