/**
 * WhatsApp Cloud API (Meta) — por assinante Pro.
 * Tokens ficam na conta do profissional; créditos utility/marketing controlados no app.
 */

import { getSql } from '@/lib/db'
import { decryptSecret, encryptSecret } from '@/lib/pro/crypto'
import { checkCan } from '@/lib/pro/entitlements'
import {
  decrementMarketingCredit,
  getMarketingCredits,
  incrementMarketingCredit,
} from '@/lib/pro/whatsapp-packs'
import type { SubscriberPlan, SubscriberRow } from '@/lib/pro/subscribers'

const GRAPH = 'https://graph.facebook.com/v21.0'

export type WaCategory = 'utility' | 'marketing' | 'service'

/** Inclusos na mensalidade Pro (marketing = 0 — pack avulso). */
export const WA_MONTHLY_INCLUDED: Record<SubscriberPlan, { utility: number; marketing: number }> = {
  standard: { utility: 0, marketing: 0 },
  pro: { utility: 200, marketing: 0 },
}

export interface SubscriberWhatsappRow {
  subscriber_id: string
  phone_number_id: string
  waba_id: string | null
  display_phone: string | null
  access_token_encrypted: string
  status: string
  last_error: string | null
}

function monthKey(d = new Date()) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

export function normalizeWaPhone(phone: string) {
  return phone.replace(/\D/g, '')
}

export async function getSubscriberWhatsapp(
  subscriberId: string,
): Promise<SubscriberWhatsappRow | null> {
  const sql = getSql()
  const rows = (await sql`
    select * from subscriber_whatsapp where subscriber_id = ${subscriberId} limit 1
  `) as SubscriberWhatsappRow[]
  return rows[0] ?? null
}

export async function upsertSubscriberWhatsapp(input: {
  subscriberId: string
  phoneNumberId: string
  accessToken: string
  wabaId?: string | null
  displayPhone?: string | null
}) {
  const sql = getSql()
  const enc = encryptSecret(input.accessToken)
  const rows = (await sql`
    insert into subscriber_whatsapp (
      subscriber_id, phone_number_id, waba_id, display_phone,
      access_token_encrypted, status, last_error, updated_at
    ) values (
      ${input.subscriberId},
      ${input.phoneNumberId.trim()},
      ${input.wabaId?.trim() || null},
      ${input.displayPhone?.trim() || null},
      ${enc},
      'active',
      null,
      now()
    )
    on conflict (subscriber_id) do update set
      phone_number_id = excluded.phone_number_id,
      waba_id = excluded.waba_id,
      display_phone = excluded.display_phone,
      access_token_encrypted = excluded.access_token_encrypted,
      status = 'active',
      last_error = null,
      updated_at = now()
    returning *
  `) as SubscriberWhatsappRow[]
  return rows[0]!
}

export async function disconnectSubscriberWhatsapp(subscriberId: string) {
  const sql = getSql()
  await sql`delete from subscriber_whatsapp where subscriber_id = ${subscriberId}`
}

export async function getWhatsappUsage(subscriberId: string, plan: SubscriberPlan) {
  const sql = getSql()
  const month = monthKey()
  const rows = (await sql`
    select utility_sent, marketing_sent from subscriber_whatsapp_usage
    where subscriber_id = ${subscriberId} and month = ${month}
    limit 1
  `) as { utility_sent: number; marketing_sent: number }[]
  const included = WA_MONTHLY_INCLUDED[plan]
  const utilitySent = rows[0]?.utility_sent ?? 0
  const marketingSent = rows[0]?.marketing_sent ?? 0
  const packCredits = await getMarketingCredits(subscriberId)
  const monthlyMarketingLeft = Math.max(0, included.marketing - marketingSent)
  return {
    month,
    utility_sent: utilitySent,
    marketing_sent: marketingSent,
    utility_included: included.utility,
    marketing_included: included.marketing,
    marketing_pack_credits: packCredits,
    utility_remaining: Math.max(0, included.utility - utilitySent),
    marketing_remaining: monthlyMarketingLeft + packCredits,
  }
}

export class WhatsappQuotaError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'WhatsappQuotaError'
  }
}

export class WhatsappPlanError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'WhatsappPlanError'
  }
}

type CreditSource = 'utility' | 'marketing_monthly' | 'marketing_pack' | 'service'

async function consumeWhatsappCredit(
  subscriberId: string,
  plan: SubscriberPlan,
  category: WaCategory,
): Promise<CreditSource> {
  if (category === 'service') return 'service'
  const usage = await getWhatsappUsage(subscriberId, plan)
  if (category === 'utility' && usage.utility_remaining < 1) {
    throw new WhatsappQuotaError(
      `Créditos utility esgotados este mês (${usage.utility_sent}/${usage.utility_included}).`,
    )
  }
  if (category === 'marketing' && usage.marketing_remaining < 1) {
    throw new WhatsappQuotaError(
      'Sem créditos de marketing. Compre um pack em Conectar.',
    )
  }

  const sql = getSql()
  const month = monthKey()

  if (category === 'utility') {
    await sql`
      insert into subscriber_whatsapp_usage (subscriber_id, month, utility_sent, marketing_sent, updated_at)
      values (${subscriberId}, ${month}, 1, 0, now())
      on conflict (subscriber_id, month) do update set
        utility_sent = subscriber_whatsapp_usage.utility_sent + 1,
        updated_at = now()
    `
    return 'utility'
  }

  const includedLeft = Math.max(0, usage.marketing_included - usage.marketing_sent)
  if (includedLeft > 0) {
    await sql`
      insert into subscriber_whatsapp_usage (subscriber_id, month, utility_sent, marketing_sent, updated_at)
      values (${subscriberId}, ${month}, 0, 1, now())
      on conflict (subscriber_id, month) do update set
        marketing_sent = subscriber_whatsapp_usage.marketing_sent + 1,
        updated_at = now()
    `
    return 'marketing_monthly'
  }

  const ok = await decrementMarketingCredit(subscriberId)
  if (!ok) {
    throw new WhatsappQuotaError('Sem créditos de marketing. Compre um pack em Conectar.')
  }
  await sql`
    insert into subscriber_whatsapp_usage (subscriber_id, month, utility_sent, marketing_sent, updated_at)
    values (${subscriberId}, ${month}, 0, 1, now())
    on conflict (subscriber_id, month) do update set
      marketing_sent = subscriber_whatsapp_usage.marketing_sent + 1,
      updated_at = now()
  `
  return 'marketing_pack'
}

async function refundWhatsappCredit(
  subscriberId: string,
  source: CreditSource,
) {
  if (source === 'service') return
  const sql = getSql()
  const month = monthKey()
  if (source === 'utility') {
    await sql`
      update subscriber_whatsapp_usage set
        utility_sent = greatest(0, utility_sent - 1),
        updated_at = now()
      where subscriber_id = ${subscriberId} and month = ${month}
    `.catch(() => {})
    return
  }
  await sql`
    update subscriber_whatsapp_usage set
      marketing_sent = greatest(0, marketing_sent - 1),
      updated_at = now()
    where subscriber_id = ${subscriberId} and month = ${month}
  `.catch(() => {})
  if (source === 'marketing_pack') {
    await incrementMarketingCredit(subscriberId).catch(() => {})
  }
}

async function graphSend(
  phoneNumberId: string,
  token: string,
  payload: Record<string, unknown>,
): Promise<{ messageId: string | null }> {
  if (token === 'mock' || process.env.WHATSAPP_CLOUD_MOCK === '1') {
    return { messageId: `mock_${Date.now()}` }
  }

  const res = await fetch(`${GRAPH}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messaging_product: 'whatsapp', ...payload }),
    signal: AbortSignal.timeout(30_000),
  })

  const json = (await res.json().catch(() => ({}))) as {
    messages?: Array<{ id?: string }>
    error?: { message?: string }
  }

  if (!res.ok) {
    throw new Error(json.error?.message ?? `WhatsApp Cloud HTTP ${res.status}`)
  }

  return { messageId: json.messages?.[0]?.id ?? null }
}

export async function assertProPlan(subscriber: SubscriberRow) {
  const entitlement = checkCan(subscriber, 'whatsapp_cloud')
  if (!entitlement.ok) throw new WhatsappPlanError(entitlement.message)
}

/** Texto livre — só dentro da janela service (cliente falou antes). Não consome crédito. */
export async function sendServiceText(input: {
  subscriber: SubscriberRow
  toPhone: string
  text: string
  clientId?: string | null
}) {
  await assertProPlan(input.subscriber)
  const wa = await getSubscriberWhatsapp(input.subscriber.id)
  if (!wa || wa.status !== 'active') throw new Error('WhatsApp não conectado')

  const token = decryptSecret(wa.access_token_encrypted)
  const to = normalizeWaPhone(input.toPhone)
  const { messageId } = await graphSend(wa.phone_number_id, token, {
    to,
    type: 'text',
    text: { body: input.text.slice(0, 4096) },
  })

  const sql = getSql()
  await sql`
    insert into subscriber_whatsapp_sends (
      subscriber_id, client_id, to_phone, category, body_preview, status, provider_message_id
    ) values (
      ${input.subscriber.id},
      ${input.clientId ?? null},
      ${to},
      'service',
      ${input.text.slice(0, 280)},
      'sent',
      ${messageId}
    )
  `
  return { messageId, category: 'service' as const }
}

/** Template utility/marketing — consome crédito do plano. */
export async function sendTemplateMessage(input: {
  subscriber: SubscriberRow
  toPhone: string
  category: 'utility' | 'marketing'
  templateName: string
  languageCode?: string
  bodyParams?: string[]
  clientId?: string | null
  preview?: string
}) {
  await assertProPlan(input.subscriber)
  const wa = await getSubscriberWhatsapp(input.subscriber.id)
  if (!wa || wa.status !== 'active') throw new Error('WhatsApp não conectado')

  const token = decryptSecret(wa.access_token_encrypted)
  const to = normalizeWaPhone(input.toPhone)
  const components =
    input.bodyParams && input.bodyParams.length > 0
      ? [
          {
            type: 'body',
            parameters: input.bodyParams.map((t) => ({ type: 'text', text: t })),
          },
        ]
      : undefined

  const sql = getSql()
  const creditSource = await consumeWhatsappCredit(
    input.subscriber.id,
    input.subscriber.plan,
    input.category,
  )
  try {
    const { messageId } = await graphSend(wa.phone_number_id, token, {
      to,
      type: 'template',
      template: {
        name: input.templateName,
        language: { code: input.languageCode ?? 'pt_BR' },
        ...(components ? { components } : {}),
      },
    })

    await sql`
      insert into subscriber_whatsapp_sends (
        subscriber_id, client_id, to_phone, category, template_name, body_preview,
        status, provider_message_id
      ) values (
        ${input.subscriber.id},
        ${input.clientId ?? null},
        ${to},
        ${input.category},
        ${input.templateName},
        ${input.preview?.slice(0, 280) ?? null},
        'sent',
        ${messageId}
      )
    `
    return { messageId, category: input.category }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    await refundWhatsappCredit(input.subscriber.id, creditSource)
    await sql`
      insert into subscriber_whatsapp_sends (
        subscriber_id, client_id, to_phone, category, template_name, body_preview,
        status, error
      ) values (
        ${input.subscriber.id},
        ${input.clientId ?? null},
        ${to},
        ${input.category},
        ${input.templateName},
        ${input.preview?.slice(0, 280) ?? null},
        'failed',
        ${message}
      )
    `
    throw e
  }
}

/** Lembrete de horário — template utility padrão do produto. */
export async function sendAppointmentReminder(input: {
  subscriber: SubscriberRow
  clientId: string
  toPhone: string
  clientName: string
  serviceName: string
  whenLabel: string
}) {
  const template =
    process.env.WHATSAPP_TEMPLATE_REMINDER?.trim() || 'lembrete_horario'
  return sendTemplateMessage({
    subscriber: input.subscriber,
    toPhone: input.toPhone,
    category: 'utility',
    templateName: template,
    bodyParams: [input.clientName, input.serviceName, input.whenLabel],
    clientId: input.clientId,
    preview: `Lembrete: ${input.clientName} · ${input.serviceName} · ${input.whenLabel}`,
  })
}

/** Reativação — template marketing (só com crédito). */
export async function sendReactivationMessage(input: {
  subscriber: SubscriberRow
  clientId: string
  toPhone: string
  clientName: string
}) {
  const template =
    process.env.WHATSAPP_TEMPLATE_REACTIVATION?.trim() || 'reativacao_cliente'
  return sendTemplateMessage({
    subscriber: input.subscriber,
    toPhone: input.toPhone,
    category: 'marketing',
    templateName: template,
    bodyParams: [input.clientName],
    clientId: input.clientId,
    preview: `Reativação: ${input.clientName}`,
  })
}

export async function findSubscriberIdByPhoneNumberId(
  phoneNumberId: string,
): Promise<string | null> {
  const sql = getSql()
  const rows = (await sql`
    select subscriber_id from subscriber_whatsapp
    where phone_number_id = ${phoneNumberId} and status = 'active'
    limit 1
  `) as { subscriber_id: string }[]
  return rows[0]?.subscriber_id ?? null
}
