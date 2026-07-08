import { NextRequest } from 'next/server'
import { ok, err } from '@/lib/api-response'
import { AUTH_COOKIE } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const expected = process.env.ROM_ACCESS_TOKEN
  if (!expected) return ok({ auth: 'disabled' })

  const body = await req.json().catch(() => null)
  const token = typeof body?.token === 'string' ? body.token : ''
  if (!token || token !== expected) return err('Senha incorreta', 401)

  const res = ok({ auth: 'ok' })
  res.cookies.set(AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
  return res
}
