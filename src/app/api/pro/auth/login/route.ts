import { NextRequest } from 'next/server'
import { ok, err, handleError } from '@/lib/api-response'
import {
  PRO_AUTH_COOKIE,
  createProSessionToken,
  proSessionCookieOptions,
} from '@/lib/pro/auth'
import { authenticateSubscriber } from '@/lib/pro/subscribers'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    const email = typeof body?.email === 'string' ? body.email.trim() : ''
    const password = typeof body?.password === 'string' ? body.password : ''
    if (!email || !password) return err('E-mail e senha obrigatórios', 400)

    const subscriber = await authenticateSubscriber(email, password)
    if (!subscriber) return err('E-mail ou senha incorretos', 401)

    const res = ok({
      id: subscriber.id,
      display_name: subscriber.display_name,
      email: subscriber.email,
      plan: subscriber.plan,
    })
    res.cookies.set(PRO_AUTH_COOKIE, createProSessionToken(subscriber.id), proSessionCookieOptions())
    return res
  } catch (e) {
    return handleError(e)
  }
}
