import { NextRequest } from 'next/server'
import { ok, err, handleError } from '@/lib/api-response'
import { checkProRateLimit } from '@/lib/pro/rate-limit'
import { findSubscriberByEmail } from '@/lib/pro/subscribers'
import { createPasswordResetToken } from '@/lib/pro/password-reset'
import { sendPasswordResetEmail } from '@/lib/pro/email'
import { Observability } from '@/lib/observability'

/**
 * Sempre responde com a mesma mensagem genérica, exista ou não a conta —
 * evita enumeração de e-mails cadastrados.
 */
export async function POST(req: NextRequest) {
  try {
    const rateLimit = await checkProRateLimit(req, {
      route: 'pro-auth-forgot-password',
      limit: 5,
      windowMs: 60_000,
    })
    if (!rateLimit.allowed) {
      const res = err('Muitas tentativas. Aguarde um minuto e tente novamente.', 429)
      res.headers.set('Retry-After', String(rateLimit.retryAfterSeconds))
      return res
    }

    const body = await req.json().catch(() => null)
    const email = typeof body?.email === 'string' ? body.email.trim() : ''
    if (!email.includes('@')) return err('E-mail inválido', 400)

    const subscriber = await findSubscriberByEmail(email)
    if (subscriber) {
      const token = createPasswordResetToken(subscriber)
      const result = await sendPasswordResetEmail(subscriber.email, token)
      if (!result.ok) {
        Observability.captureMessage(
          `HairSales: falha ao enviar e-mail de reset de senha (${result.error})`,
          'error',
        )
      }
    }

    return ok({ sent: true })
  } catch (e) {
    return handleError(e)
  }
}
