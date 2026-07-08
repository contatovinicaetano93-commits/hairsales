import { createHmac, timingSafeEqual } from 'crypto'
import { NextRequest } from 'next/server'

export const AUTH_COOKIE = 'rom_session'

const DEFAULT_ADMIN_USER = 'admin'

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false
  return timingSafeEqual(Buffer.from(a), Buffer.from(b))
}

export function getAdminUser() {
  return (process.env.ROM_ADMIN_USER ?? DEFAULT_ADMIN_USER).trim()
}

/** Senha admin — ROM_ADMIN_PASSWORD tem prioridade; ROM_ACCESS_TOKEN é legado. */
export function getAdminPassword() {
  return (process.env.ROM_ADMIN_PASSWORD ?? process.env.ROM_ACCESS_TOKEN ?? '').trim()
}

export function isAuthEnabled() {
  return Boolean(getAdminPassword())
}

export function createSessionToken() {
  const password = getAdminPassword()
  return createHmac('sha256', password).update(`rom-session:${getAdminUser()}`).digest('hex')
}

export function validateAdminCredentials(username: string, password: string) {
  const expectedUser = getAdminUser()
  const expectedPass = getAdminPassword()
  if (!expectedPass) return false
  return safeEqual(username.trim(), expectedUser) && safeEqual(password, expectedPass)
}

export function isAuthorized(req: NextRequest) {
  if (!isAuthEnabled()) return true

  const session = req.cookies.get(AUTH_COOKIE)?.value
  if (session && safeEqual(session, createSessionToken())) return true

  const auth = req.headers.get('authorization')
  const cron = process.env.CRON_SECRET
  if (cron && (auth === `Bearer ${cron}` || req.headers.get('x-cron-secret') === cron)) return true

  // Legado: Bearer com ROM_ACCESS_TOKEN ou ROM_ADMIN_PASSWORD
  const legacyToken = getAdminPassword()
  if (legacyToken && auth === `Bearer ${legacyToken}`) return true

  return false
}

export function requireAuth(req: NextRequest) {
  if (!isAuthorized(req)) {
    return { ok: false as const, status: 401 as const, message: 'Não autorizado' }
  }
  return { ok: true as const }
}

/** Evita open redirect no login — só paths internos relativos. */
export function sanitizeRedirectPath(next: string | null | undefined, fallback = '/admin') {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return fallback
  if (next.includes('://') || next.includes('\\')) return fallback
  return next
}
