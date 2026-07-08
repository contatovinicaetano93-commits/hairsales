import { ok } from '@/lib/api-response'
import { AUTH_COOKIE } from '@/lib/auth'

export async function POST() {
  const res = ok({ auth: 'logged_out' })
  res.cookies.set(AUTH_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 })
  return res
}
