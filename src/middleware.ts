import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { AUTH_COOKIE } from '@/lib/auth'

function isAuthorized(req: NextRequest) {
  const expected = process.env.ROM_ACCESS_TOKEN
  if (!expected) return true

  const cookie = req.cookies.get(AUTH_COOKIE)?.value
  if (cookie === expected) return true

  const auth = req.headers.get('authorization')
  if (auth === `Bearer ${expected}`) return true

  const cron = process.env.CRON_SECRET
  if (cron && (auth === `Bearer ${cron}` || req.headers.get('x-cron-secret') === cron)) return true

  return false
}

export function middleware(req: NextRequest) {
  if (!process.env.ROM_ACCESS_TOKEN) return NextResponse.next()

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
