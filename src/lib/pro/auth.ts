import type { NextRequest } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { findSubscriberById, type SubscriberRow } from '@/lib/pro/subscribers'
import { getProDataSecret } from '@/lib/pro/secrets'

export const PRO_AUTH_COOKIE = 'vitrini_pro_session'
const PRO_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30

function sessionSecret() {
  return getProDataSecret()
}

function sign(payload: string) {
  return createHmac('sha256', sessionSecret()).update(payload).digest('base64url')
}

export function createProSessionToken(subscriberId: string) {
  const exp = Math.floor(Date.now() / 1000) + PRO_SESSION_MAX_AGE_SECONDS
  const payload = Buffer.from(JSON.stringify({ sid: subscriberId, v: 1, exp }), 'utf8').toString('base64url')
  return `${payload}.${sign(payload)}`
}

export function parseProSessionToken(token: string): string | null {
  const [payload, sig] = token.split('.')
  if (!payload || !sig) return null
  const expected = sign(payload)
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  try {
    const json = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      sid?: string
      exp?: unknown
    }
    if (json.exp !== undefined) {
      if (typeof json.exp !== 'number' || !Number.isFinite(json.exp)) return null
      if (json.exp < Math.floor(Date.now() / 1000)) return null
    }
    return typeof json.sid === 'string' ? json.sid : null
  } catch {
    return null
  }
}

export interface ProSession {
  subscriber: SubscriberRow
}

export async function getProSession(req: NextRequest): Promise<ProSession | null> {
  const cookie = req.cookies.get(PRO_AUTH_COOKIE)?.value
  if (!cookie) return null
  const sid = parseProSessionToken(cookie)
  if (!sid) return null
  const subscriber = await findSubscriberById(sid)
  if (!subscriber) return null
  return { subscriber }
}

export async function requireProSession(req: NextRequest) {
  const session = await getProSession(req)
  if (!session) {
    return { ok: false as const, status: 401 as const, message: 'Não autorizado' }
  }
  return { ok: true as const, session }
}

export function proSessionCookieOptions(maxAge = PRO_SESSION_MAX_AGE_SECONDS) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge,
  }
}
