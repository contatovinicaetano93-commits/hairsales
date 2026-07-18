import { NextRequest } from 'next/server'
import { ok, err, handleError } from '@/lib/api-response'
import {
  PRO_AUTH_COOKIE,
  createProSessionToken,
  proSessionCookieOptions,
} from '@/lib/pro/auth'
import { createSubscriber, findSubscriberByEmail } from '@/lib/pro/subscribers'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    const displayName = typeof body?.display_name === 'string' ? body.display_name.trim() : ''
    const email = typeof body?.email === 'string' ? body.email.trim() : ''
    const password = typeof body?.password === 'string' ? body.password : ''

    if (displayName.length < 2) return err('Informe seu nome como no Avec/Trinks', 400)
    if (!email.includes('@')) return err('E-mail inválido', 400)
    if (password.length < 6) return err('Senha precisa ter pelo menos 6 caracteres', 400)

    if (await findSubscriberByEmail(email)) {
      return err('Já existe conta com este e-mail', 409)
    }

    const subscriber = await createSubscriber({ displayName, email, password })
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
