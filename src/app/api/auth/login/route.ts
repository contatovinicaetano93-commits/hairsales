import { NextRequest } from 'next/server'
import { ok, err } from '@/lib/api-response'
import {
  AUTH_COOKIE,
  createSessionToken,
  getAdminUser,
  isAuthEnabled,
  validateAdminCredentials,
} from '@/lib/auth'

export async function POST(req: NextRequest) {
  if (!isAuthEnabled()) return ok({ auth: 'disabled' })

  const body = await req.json().catch(() => null)
  const username = typeof body?.username === 'string' ? body.username : ''
  const password = typeof body?.password === 'string' ? body.password : ''
  const legacyToken = typeof body?.token === 'string' ? body.token : ''

  const user = username || getAdminUser()
  const pass = password || legacyToken

  if (!pass || !validateAdminCredentials(user, pass)) {
    return err('Usuário ou senha incorretos', 401)
  }

  const res = ok({ auth: 'ok' })
  res.cookies.set(AUTH_COOKIE, createSessionToken(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
  return res
}
