import { NextRequest } from 'next/server'
import { ok, err, handleError } from '@/lib/api-response'
import { PRO_AUTH_COOKIE, proSessionCookieOptions, requireProSession } from '@/lib/pro/auth'
import { checkProRateLimit } from '@/lib/pro/rate-limit'
import { authenticateSubscriber, deleteSubscriberAccount } from '@/lib/pro/subscribers'

/**
 * Exclusão de conta pelo próprio assinante (LGPD, direito ao esquecimento).
 * Exige a senha atual — ação irreversível, sem tela de confirmação no meio.
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await requireProSession(req)
    if (!session.ok) return err(session.message, session.status)

    const rateLimit = await checkProRateLimit(req, {
      route: 'pro-account-delete',
      limit: 5,
      windowMs: 60_000,
    })
    if (!rateLimit.allowed) {
      const res = err('Muitas tentativas. Aguarde um minuto e tente novamente.', 429)
      res.headers.set('Retry-After', String(rateLimit.retryAfterSeconds))
      return res
    }

    const body = await req.json().catch(() => null)
    const password = typeof body?.password === 'string' ? body.password : ''
    if (!password) return err('Informe sua senha atual para confirmar', 400)

    const confirmed = await authenticateSubscriber(session.session.subscriber.email, password)
    if (!confirmed) return err('Senha incorreta', 401)

    await deleteSubscriberAccount(session.session.subscriber.id)

    const res = ok({ deleted: true })
    res.cookies.set(PRO_AUTH_COOKIE, '', { ...proSessionCookieOptions(0), maxAge: 0 })
    return res
  } catch (e) {
    return handleError(e)
  }
}
