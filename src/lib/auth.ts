import { NextRequest } from 'next/server'

export const AUTH_COOKIE = 'rom_access'

export function isAuthEnabled() {
  return Boolean(process.env.ROM_ACCESS_TOKEN)
}

export function getAccessToken() {
  return process.env.ROM_ACCESS_TOKEN ?? ''
}

export function isAuthorized(req: NextRequest) {
  const expected = process.env.ROM_ACCESS_TOKEN
  if (!expected) return true

  const cookie = req.cookies.get(AUTH_COOKIE)?.value
  if (cookie === expected) return true

  const auth = req.headers.get('authorization')
  if (auth === `Bearer ${expected}`) return true

  const cron = process.env.CRON_SECRET
  if (cron && auth === `Bearer ${cron}`) return true
  if (cron && req.headers.get('x-cron-secret') === cron) return true

  return false
}

export function requireAuth(req: NextRequest) {
  if (!isAuthorized(req)) {
    return { ok: false as const, status: 401 as const, message: 'Não autorizado' }
  }
  return { ok: true as const }
}
