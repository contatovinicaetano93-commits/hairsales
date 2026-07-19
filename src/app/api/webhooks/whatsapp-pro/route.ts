import { NextRequest, NextResponse } from 'next/server'
import { ok, err } from '@/lib/api-response'
import { findSubscriberById } from '@/lib/pro/subscribers'
import {
  findSubscriberIdByPhoneNumberId,
  sendServiceText,
} from '@/lib/pro/whatsapp-cloud'
import { askSubscriberAssistant } from '@/lib/pro/assistant'
import { getSql } from '@/lib/db'
import { can } from '@/lib/pro/entitlements'
import { getWhatsAppProAppSecret } from '@/lib/pro/secrets'
import { verifyMetaWebhookSignature } from '@/lib/pro/whatsapp-signature'

/**
 * Webhook Cloud API do número do assinante Pro.
 * GET = verificação Meta · POST = inbound (janela service).
 */

export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get('hub.mode')
  const token = req.nextUrl.searchParams.get('hub.verify_token')
  const challenge = req.nextUrl.searchParams.get('hub.challenge')
  const expected =
    process.env.WHATSAPP_PRO_VERIFY_TOKEN || process.env.WHATSAPP_WEBHOOK_SECRET || ''

  if (mode === 'subscribe' && expected && token === expected && challenge) {
    return new NextResponse(challenge, { status: 200 })
  }
  return err('Verificação falhou', 403)
}

export async function POST(req: NextRequest) {
  const rawBody = Buffer.from(await req.arrayBuffer())
  const appSecret = getWhatsAppProAppSecret()

  if (appSecret) {
    const verified = verifyMetaWebhookSignature(
      rawBody,
      req.headers.get('x-hub-signature-256'),
      appSecret,
    )
    if (!verified) return err('Assinatura inválida', 401)
  } else if (process.env.NODE_ENV === 'production') {
    // Meta signs Cloud API webhooks with the app secret; fail closed if it was not configured.
    return err('WHATSAPP_PRO_APP_SECRET não configurado', 401)
  }

  const body = parseWebhookBody(rawBody)
  if (!body) return ok({ ignored: true })

  try {
    const entry = body.entry?.[0]
    const change = entry?.changes?.[0]
    const value = change?.value
    const phoneNumberId = value?.metadata?.phone_number_id as string | undefined
    const message = value?.messages?.[0]
    if (!phoneNumberId || !message) return ok({ ignored: true })

    const from = String(message.from ?? '')
    const text =
      message.text?.body ||
      message.button?.text ||
      message.interactive?.button_reply?.title ||
      ''

    if (!from || !text) return ok({ ignored: true })

    const subscriberId = await findSubscriberIdByPhoneNumberId(phoneNumberId)
    if (!subscriberId) return ok({ ignored: true, reason: 'unknown_number' })

    const subscriber = await findSubscriberById(subscriberId)
    if (!subscriber || !can(subscriber, 'whatsapp_cloud')) {
      return ok({ ignored: true, reason: 'not_entitled' })
    }

    // Associa / cria cliente na carteira do assinante pelo telefone
    const sql = getSql()
    const existing = (await sql`
      select id from subscriber_clients
      where subscriber_id = ${subscriberId}
        and regexp_replace(coalesce(phone,''), '\D', '', 'g') like ${'%' + from.slice(-8) + '%'}
      limit 1
    `) as { id: string }[]

    let clientId = existing[0]?.id
    if (!clientId) {
      const created = (await sql`
        insert into subscriber_clients (subscriber_id, phone, name, status, updated_at)
        values (${subscriberId}, ${from}, ${null}, 'novo', now())
        returning id
      `) as { id: string }[]
      clientId = created[0]?.id
    }

    // Resposta da assistente do pro (não é recepção do salão ROM)
    const result = await askSubscriberAssistant(
      subscriber,
      `Cliente no WhatsApp (${from}) disse: ${text}. Sugira uma resposta curta e calorosa em 1ª pessoa como se eu fosse o profissional, ou diga o que fazer.`,
    )

    // Envia como service (grátis na janela) — texto sugerido
    await sendServiceText({
      subscriber,
      toPhone: from,
      text: result.answer.slice(0, 1000),
      clientId,
    }).catch(() => {})

    return ok({ replied: true, source: result.source })
  } catch (e) {
    console.error('[whatsapp-pro webhook]', e)
    return ok({ replied: false, error: e instanceof Error ? e.message : String(e) })
  }
}

function parseWebhookBody(rawBody: Buffer) {
  try {
    return JSON.parse(rawBody.toString('utf8') || 'null')
  } catch {
    return null
  }
}
