import { NextRequest } from 'next/server'
import { ok, err, handleError } from '@/lib/api-response'
import { requireProSession } from '@/lib/pro/auth'
import { checkCan } from '@/lib/pro/entitlements'
import {
  exchangeEmbeddedSignupCode,
  getEmbeddedSignupConfig,
} from '@/lib/pro/whatsapp-embedded'
import { upsertSubscriberWhatsapp } from '@/lib/pro/whatsapp-cloud'

export async function GET(req: NextRequest) {
  try {
    const auth = await requireProSession(req)
    if (!auth.ok) return err(auth.message, auth.status)
    const entitlement = checkCan(auth.session.subscriber, 'whatsapp_cloud')
    if (!entitlement.ok) return err(entitlement.message, 403)
    return ok(getEmbeddedSignupConfig())
  } catch (e) {
    return handleError(e)
  }
}

/** Troca o code do Embedded Signup por token e grava na conexão do assinante. */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireProSession(req)
    if (!auth.ok) return err(auth.message, auth.status)
    const entitlement = checkCan(auth.session.subscriber, 'whatsapp_cloud')
    if (!entitlement.ok) return err(entitlement.message, 403)

    const body = await req.json().catch(() => null)
    const code = typeof body?.code === 'string' ? body.code.trim() : ''
    const phoneOverride =
      typeof body?.phone_number_id === 'string' ? body.phone_number_id.trim() : ''
    const displayPhone =
      typeof body?.display_phone === 'string' ? body.display_phone.trim() : null

    if (!code) return err('Código de conexão obrigatório', 400)

    const exchanged = await exchangeEmbeddedSignupCode(code)
    const phoneNumberId = phoneOverride || exchanged.phone_number_id
    if (!phoneNumberId) {
      return err(
        'Não foi possível obter o número automaticamente. Cole o ID do número manualmente ou finalize a configuração pela Meta.',
        422,
      )
    }

    await upsertSubscriberWhatsapp({
      subscriberId: auth.session.subscriber.id,
      phoneNumberId,
      accessToken: exchanged.access_token,
      wabaId: exchanged.waba_id,
      displayPhone,
    })

    return ok({
      connected: true,
      phone_number_id: phoneNumberId,
      waba_id: exchanged.waba_id,
    })
  } catch (e) {
    return handleError(e)
  }
}
