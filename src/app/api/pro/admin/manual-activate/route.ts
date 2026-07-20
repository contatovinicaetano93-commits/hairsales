import { randomBytes, timingSafeEqual } from 'crypto'
import { NextRequest } from 'next/server'
import { ok, err, handleError } from '@/lib/api-response'
import { checkProRateLimit } from '@/lib/pro/rate-limit'
import {
  createSubscriber,
  findSubscriberByEmail,
  setSubscriberPlanAndStatus,
  type SubscriberPlan,
} from '@/lib/pro/subscribers'
import { createPasswordResetToken } from '@/lib/pro/password-reset'
import { sendPasswordResetEmail, sendWelcomeEmail } from '@/lib/pro/email'

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.PRO_ADMIN_SECRET?.trim()
  if (!secret) return false
  const provided = req.headers.get('x-admin-secret')?.trim() ?? ''
  const a = Buffer.from(provided)
  const b = Buffer.from(secret)
  return a.length === b.length && timingSafeEqual(a, b)
}

/**
 * Ativação manual de assinante — pra fechar cliente pago fora do Stripe
 * (Pix/transferência) enquanto o checkout automático não está implantado.
 * Cria (ou reativa) a conta como `active` e manda e-mail pro cliente definir
 * a própria senha, sem ninguém além dele saber a senha.
 */
export async function POST(req: NextRequest) {
  try {
    if (!isAuthorized(req)) return err('Não autorizado', 401)

    const rateLimit = await checkProRateLimit(req, {
      route: 'pro-admin-manual-activate',
      limit: 20,
      windowMs: 60_000,
    })
    if (!rateLimit.allowed) return err('Muitas tentativas. Aguarde um minuto.', 429)

    const body = await req.json().catch(() => null)
    const displayName = typeof body?.display_name === 'string' ? body.display_name.trim() : ''
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
    const planRaw = typeof body?.plan === 'string' ? body.plan : 'standard'
    const plan: SubscriberPlan = planRaw === 'pro' ? 'pro' : 'standard'

    if (!email.includes('@')) return err('E-mail inválido', 400)

    let subscriber = await findSubscriberByEmail(email)
    let created = false

    if (subscriber) {
      subscriber = await setSubscriberPlanAndStatus(subscriber.id, plan, 'active')
    } else {
      if (displayName.length < 2) return err('Informe o nome do cliente', 400)
      subscriber = await createSubscriber({
        displayName,
        email,
        password: randomBytes(24).toString('base64url'),
        plan,
        subscription_status: 'active',
      })
      created = true
    }
    if (!subscriber) return err('Não foi possível ativar a conta', 500)

    if (created) {
      void sendWelcomeEmail(subscriber.email, subscriber.display_name)
    }
    const resetToken = createPasswordResetToken(subscriber)
    void sendPasswordResetEmail(subscriber.email, resetToken)

    return ok({
      id: subscriber.id,
      email: subscriber.email,
      plan: subscriber.plan,
      subscription_status: subscriber.subscription_status,
      created,
    })
  } catch (e) {
    return handleError(e)
  }
}
