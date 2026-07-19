import { NextRequest } from 'next/server'
import { ok, err, handleError } from '@/lib/api-response'
import {
  PRO_AUTH_COOKIE,
  createProSessionToken,
  proSessionCookieOptions,
} from '@/lib/pro/auth'
import { createSubscriber, findSubscriberByEmail } from '@/lib/pro/subscribers'
import { isStripeConfigured } from '@/lib/pro/stripe'

function allowDemoRegister() {
  return (
    process.env.PRO_ALLOW_SELF_UPGRADE === '1' ||
    process.env.PRO_ALLOW_SELF_UPGRADE === 'true' ||
    process.env.NODE_ENV !== 'production'
  )
}

/**
 * Cadastro direto só em demo / sem Stripe.
 * Em produção com Stripe: pague em /api/pro/checkout/start e complete em /pro/completar-cadastro.
 */
export async function POST(req: NextRequest) {
  try {
    if (isStripeConfigured() && !allowDemoRegister()) {
      return err(
        'Assine Standard (R$ 29,90) ou Pro (R$ 199,90) na landing antes de criar a conta.',
        402,
      )
    }

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

    const subscriber = await createSubscriber({ displayName, email, password, plan: 'free' })
    const res = ok({
      id: subscriber.id,
      display_name: subscriber.display_name,
      email: subscriber.email,
      plan: subscriber.plan,
      demo: true,
    })
    res.cookies.set(PRO_AUTH_COOKIE, createProSessionToken(subscriber.id), proSessionCookieOptions())
    return res
  } catch (e) {
    return handleError(e)
  }
}
