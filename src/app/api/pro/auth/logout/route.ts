import { ok } from '@/lib/api-response'
import { PRO_AUTH_COOKIE, proSessionCookieOptions } from '@/lib/pro/auth'

export async function POST() {
  const res = ok({ ok: true })
  res.cookies.set(PRO_AUTH_COOKIE, '', { ...proSessionCookieOptions(0), maxAge: 0 })
  return res
}
