import type { NextRequest } from 'next/server'
import { ok } from '@/lib/api-response'
import { PRO_AUTH_COOKIE, parseProSessionToken, proSessionCookieOptions } from '@/lib/pro/auth'
import { bumpSubscriberSessionVersion } from '@/lib/pro/subscribers'

export async function POST(req: NextRequest) {
  const token = req.cookies.get(PRO_AUTH_COOKIE)?.value
  const parsed = token ? parseProSessionToken(token) : null
  if (parsed) {
    await bumpSubscriberSessionVersion(parsed.sid)
  }

  const res = ok({ ok: true })
  res.cookies.set(PRO_AUTH_COOKIE, '', { ...proSessionCookieOptions(0), maxAge: 0 })
  return res
}
