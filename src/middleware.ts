import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { isHairsalesSurface } from '@/lib/app-surface'
import { isAuthorized, isAuthEnabled, getSession } from '@/lib/auth'
import { isCronAuthorized } from '@/lib/cron-auth'

const PUBLIC_API_PREFIXES = ['/api/auth', '/api/health', '/api/webhooks']
const PRO_WEBHOOK_PATHS = [
  '/api/webhooks/stripe',
  '/api/webhooks/telegram-pro',
  '/api/webhooks/whatsapp-pro',
]

function isPathOrSubpath(pathname: string, basePath: string) {
  return pathname === basePath || pathname.startsWith(`${basePath}/`)
}

function isPublicApi(pathname: string) {
  return PUBLIC_API_PREFIXES.some((p) => isPathOrSubpath(pathname, p))
}

/** App do profissional — autenticação própria (cookie vitrini_pro_session), não ROM. */
function isProAppApi(pathname: string) {
  return isPathOrSubpath(pathname, '/api/me') || isPathOrSubpath(pathname, '/api/pro')
}

function isProWebhook(pathname: string) {
  return PRO_WEBHOOK_PATHS.some((p) => isPathOrSubpath(pathname, p))
}

function isProPage(pathname: string) {
  return isPathOrSubpath(pathname, '/pro')
}

function isRomSurfacePage(pathname: string) {
  return (
    pathname === '/login' ||
    pathname === '/hoje' ||
    pathname === '/dashboard' ||
    pathname === '/contatos' ||
    pathname.startsWith('/contatos/') ||
    pathname === '/admin' ||
    pathname.startsWith('/admin/') ||
    pathname === '/financeiro' ||
    pathname.startsWith('/financeiro/') ||
    pathname === '/estoque' ||
    pathname.startsWith('/estoque/') ||
    pathname === '/onboarding' ||
    pathname.startsWith('/onboarding/') ||
    pathname === '/observability' ||
    pathname.startsWith('/observability/')
  )
}

function isHairsalesAllowedApi(pathname: string) {
  return isPathOrSubpath(pathname, '/api/health') || isProAppApi(pathname) || isProWebhook(pathname)
}

function isMonitoringPath(pathname: string) {
  return isPathOrSubpath(pathname, '/monitoring')
}

function isFinancePath(pathname: string) {
  return pathname === '/financeiro' || pathname.startsWith('/financeiro/') || pathname.startsWith('/api/financeiro/')
}

function isStockPath(pathname: string) {
  return pathname === '/estoque' || pathname.startsWith('/estoque/') || pathname.startsWith('/api/estoque/')
}

function isAdminPath(pathname: string) {
  return (
    pathname === '/admin' ||
    pathname.startsWith('/admin/') ||
    pathname === '/api/admin' ||
    pathname.startsWith('/api/admin/')
  )
}

function isObservabilityPath(pathname: string) {
  return (
    pathname === '/observability' ||
    pathname.startsWith('/observability/') ||
    pathname === '/api/observability' ||
    pathname.startsWith('/api/observability/')
  )
}

function isPrivilegedStaffApi(pathname: string) {
  return (
    pathname === '/api/seed' ||
    pathname.startsWith('/api/seed/') ||
    pathname === '/api/director-report' ||
    pathname.startsWith('/api/director-report/') ||
    pathname === '/api/avec/sync' ||
    pathname.startsWith('/api/avec/sync/')
  )
}

// Área compartilhada por todos os papéis (admin, staff, financeiro) — não é exclusiva do financeiro.
function isOnboardingPath(pathname: string) {
  return pathname === '/onboarding' || pathname.startsWith('/onboarding/') || pathname.startsWith('/api/onboarding/')
}

function isProtectedPage(pathname: string) {
  return (
    pathname === '/' ||
    pathname === '/hoje' ||
    pathname === '/dashboard' ||
    pathname === '/contatos' ||
    pathname.startsWith('/contatos/') ||
    pathname === '/admin' ||
    pathname.startsWith('/admin/') ||
    pathname === '/financeiro' ||
    pathname.startsWith('/financeiro/') ||
    pathname === '/estoque' ||
    pathname.startsWith('/estoque/') ||
    pathname === '/onboarding' ||
    pathname.startsWith('/onboarding/') ||
    pathname === '/observability' ||
    pathname.startsWith('/observability/')
  )
}

function isProtectedApi(pathname: string) {
  return pathname.startsWith('/api/') && !isPublicApi(pathname)
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (isHairsalesSurface()) {
    if (isProPage(pathname) || isMonitoringPath(pathname)) return NextResponse.next()
    if (pathname.startsWith('/api/')) {
      if (isHairsalesAllowedApi(pathname)) return NextResponse.next()
      return NextResponse.json({ error: 'Rota indisponível no HairSales' }, { status: 403 })
    }
    if (pathname === '/' || isRomSurfacePage(pathname)) {
      return NextResponse.redirect(new URL('/pro/login', req.url))
    }
    return NextResponse.next()
  }

  if (isProPage(pathname)) {
    return NextResponse.redirect(new URL('/login', req.url))
  }
  if (isProAppApi(pathname) || isProWebhook(pathname)) {
    return NextResponse.json({ error: 'Rota indisponível no painel ROM' }, { status: 403 })
  }

  if (!isAuthEnabled()) return NextResponse.next()

  if (pathname === '/login') return NextResponse.next()

  const needsAuth = isProtectedPage(pathname) || isProtectedApi(pathname)
  if (!needsAuth) return NextResponse.next()

  const allowHeaderTokens =
    pathname === '/api/avec/sync' ||
    pathname === '/api/estoque/sync' ||
    pathname === '/api/director-report' ||
    pathname === '/api/lgpd/purge' ||
    pathname === '/api/reminders/financeiro' ||
    pathname === '/api/pro/reminders'
  if (!(await isAuthorized(req, { allowHeaderTokens }))) {
    if (isProtectedApi(pathname)) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
    const login = new URL('/login', req.url)
    login.searchParams.set('next', pathname === '/' ? '/hoje' : pathname)
    return NextResponse.redirect(login)
  }

  // Cron (Vercel) chamando uma rota dentro de um prefixo isolado (ex: /api/estoque/sync)
  // — a rota já valida CRON_SECRET sozinha; isolamento de role de sessão não se aplica
  // a uma chamada sem sessão (senão o cron cairia no 403 "acesso restrito").
  if (isCronAuthorized(req)) return NextResponse.next()

  // Isolamento do painel Financeiro (Sprint 4): financeiro enxerga /financeiro
  // + /estoque (acesso duplo, financeiro cuida de ambos) + /onboarding
  // (compartilhado) — não hoje/dashboard/contatos/admin.
  const session = await getSession(req)
  const role = session?.role
  const financePath = isFinancePath(pathname)
  const stockPath = isStockPath(pathname)
  const onboardingPath = isOnboardingPath(pathname)

  if (
    role === 'staff' &&
    (isAdminPath(pathname) || isObservabilityPath(pathname) || isPrivilegedStaffApi(pathname))
  ) {
    if (isProtectedApi(pathname)) {
      return NextResponse.json({ error: 'Acesso restrito ao admin operacional' }, { status: 403 })
    }
    return NextResponse.redirect(new URL('/hoje', req.url))
  }

  if (
    role === 'financeiro' &&
    (isProtectedPage(pathname) || isProtectedApi(pathname)) &&
    !financePath &&
    !stockPath &&
    !onboardingPath
  ) {
    return NextResponse.redirect(new URL('/financeiro', req.url))
  }
  // Isolamento do painel Estoque: estoque só enxerga /estoque (+ /onboarding) —
  // nunca financeiro/hoje/dashboard/contatos/admin.
  if (
    role === 'estoque' &&
    (isProtectedPage(pathname) || isProtectedApi(pathname)) &&
    !stockPath &&
    !onboardingPath
  ) {
    return NextResponse.redirect(new URL('/estoque', req.url))
  }
  if (financePath && role !== 'admin' && role !== 'financeiro') {
    if (isProtectedApi(pathname)) {
      return NextResponse.json({ error: 'Acesso restrito ao financeiro' }, { status: 403 })
    }
    return NextResponse.redirect(new URL('/hoje', req.url))
  }
  if (stockPath && role !== 'admin' && role !== 'financeiro' && role !== 'estoque') {
    if (isProtectedApi(pathname)) {
      return NextResponse.json({ error: 'Acesso restrito ao estoque' }, { status: 403 })
    }
    return NextResponse.redirect(new URL('/hoje', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/',
    '/hoje',
    '/dashboard',
    '/contatos',
    '/contatos/:path*',
    '/admin',
    '/admin/:path*',
    '/financeiro',
    '/financeiro/:path*',
    '/estoque',
    '/estoque/:path*',
    '/onboarding',
    '/onboarding/:path*',
    '/observability',
    '/observability/:path*',
    '/login',
    '/pro',
    '/pro/:path*',
    '/monitoring',
    '/monitoring/:path*',
    '/api/:path*',
  ],
}
