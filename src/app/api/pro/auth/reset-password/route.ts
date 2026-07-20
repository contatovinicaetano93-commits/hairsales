import { NextRequest } from 'next/server'
import { ok, err, handleError } from '@/lib/api-response'
import { checkProRateLimit } from '@/lib/pro/rate-limit'
import {
  findSubscriberById,
  updateSubscriberPassword,
  bumpSubscriberSessionVersion,
} from '@/lib/pro/subscribers'
import {
  unsafePeekResetTokenSubscriberId,
  verifyPasswordResetToken,
} from '@/lib/pro/password-reset'

export async function POST(req: NextRequest) {
  try {
    const rateLimit = await checkProRateLimit(req, {
      route: 'pro-auth-reset-password',
      limit: 10,
      windowMs: 60_000,
    })
    if (!rateLimit.allowed) {
      const res = err('Muitas tentativas. Aguarde um minuto e tente novamente.', 429)
      res.headers.set('Retry-After', String(rateLimit.retryAfterSeconds))
      return res
    }

    const body = await req.json().catch(() => null)
    const token = typeof body?.token === 'string' ? body.token : ''
    const password = typeof body?.password === 'string' ? body.password : ''
    if (!token) return err('Link inválido', 400)
    if (password.length < 6) return err('Senha precisa ter pelo menos 6 caracteres', 400)

    const sid = unsafePeekResetTokenSubscriberId(token)
    if (!sid) return err('Link inválido ou expirado', 400)

    const subscriber = await findSubscriberById(sid)
    if (!subscriber || !verifyPasswordResetToken(token, subscriber)) {
      return err('Link inválido ou expirado', 400)
    }

    await updateSubscriberPassword(subscriber.id, password)
    // Invalida qualquer sessão ativa (e o próprio token de reset, já que ele
    // depende do password_hash anterior) após a troca de senha.
    await bumpSubscriberSessionVersion(subscriber.id)

    return ok({ reset: true })
  } catch (e) {
    return handleError(e)
  }
}
