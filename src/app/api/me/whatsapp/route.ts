import { NextRequest } from 'next/server'
import { ok, err, handleError } from '@/lib/api-response'
import { requireProSession } from '@/lib/pro/auth'
import {
  disconnectSubscriberWhatsapp,
  getSubscriberWhatsapp,
  getWhatsappUsage,
  upsertSubscriberWhatsapp,
  WhatsappPlanError,
} from '@/lib/pro/whatsapp-cloud'
import { listMarketingPacks } from '@/lib/pro/whatsapp-packs'
import { getEmbeddedSignupConfig } from '@/lib/pro/whatsapp-embedded'

export async function GET(req: NextRequest) {
  try {
    const auth = await requireProSession(req)
    if (!auth.ok) return err(auth.message, auth.status)

    const wa = await getSubscriberWhatsapp(auth.session.subscriber.id)
    const usage = await getWhatsappUsage(
      auth.session.subscriber.id,
      auth.session.subscriber.plan,
    )

    return ok({
      plan: auth.session.subscriber.plan,
      connected: Boolean(wa && wa.status === 'active'),
      display_phone: wa?.display_phone ?? null,
      phone_number_id: wa ? `${wa.phone_number_id.slice(0, 4)}…` : null,
      usage,
      packs: listMarketingPacks(),
      embedded_signup: getEmbeddedSignupConfig(),
      templates: {
        reminder: process.env.WHATSAPP_TEMPLATE_REMINDER || 'lembrete_horario',
        reactivation: process.env.WHATSAPP_TEMPLATE_REACTIVATION || 'reativacao_cliente',
      },
    })
  } catch (e) {
    return handleError(e)
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireProSession(req)
    if (!auth.ok) return err(auth.message, auth.status)

    if (auth.session.subscriber.plan !== 'pro') {
      return err(
        'WhatsApp Cloud API está no plano Pro. No Free use Telegram + app.',
        403,
      )
    }

    const body = await req.json().catch(() => null)
    const phoneNumberId =
      typeof body?.phone_number_id === 'string' ? body.phone_number_id.trim() : ''
    const accessToken =
      typeof body?.access_token === 'string' ? body.access_token.trim() : ''
    const wabaId = typeof body?.waba_id === 'string' ? body.waba_id.trim() : null
    const displayPhone =
      typeof body?.display_phone === 'string' ? body.display_phone.trim() : null

    if (!phoneNumberId || !accessToken) {
      return err('Informe phone_number_id e access_token do WhatsApp Cloud', 400)
    }

    const row = await upsertSubscriberWhatsapp({
      subscriberId: auth.session.subscriber.id,
      phoneNumberId,
      accessToken,
      wabaId,
      displayPhone,
    })

    return ok({
      connected: true,
      phone_number_id: row.phone_number_id,
      display_phone: row.display_phone,
    })
  } catch (e) {
    if (e instanceof WhatsappPlanError) return err(e.message, 403)
    return handleError(e)
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireProSession(req)
    if (!auth.ok) return err(auth.message, auth.status)
    await disconnectSubscriberWhatsapp(auth.session.subscriber.id)
    return ok({ connected: false })
  } catch (e) {
    return handleError(e)
  }
}
