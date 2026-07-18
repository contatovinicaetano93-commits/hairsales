import { randomBytes } from 'crypto'
import { getSql } from '@/lib/db'
import { sendTelegramMessage } from '@/lib/telegram/bot'
import type { SubscriberRow } from '@/lib/pro/subscribers'

export async function createTelegramLinkCode(subscriberId: string): Promise<{
  code: string
  expires_at: string
}> {
  const sql = getSql()
  const code = randomBytes(3).toString('hex') // 6 chars
  const expires = new Date(Date.now() + 15 * 60_000).toISOString()

  await sql`delete from subscriber_telegram_link_codes where subscriber_id = ${subscriberId}`
  await sql`
    insert into subscriber_telegram_link_codes (code, subscriber_id, expires_at)
    values (${code}, ${subscriberId}, ${expires})
  `

  return { code, expires_at: expires }
}

export async function linkTelegramByCode(
  code: string,
  chatId: string,
): Promise<SubscriberRow | null> {
  const sql = getSql()
  const rows = (await sql`
    select subscriber_id from subscriber_telegram_link_codes
    where code = ${code.trim().toLowerCase()} and expires_at > now()
    limit 1
  `) as { subscriber_id: string }[]

  const hit = rows[0]
  if (!hit) return null

  // Libera chat se já estava em outro assinante
  await sql`
    update subscribers set telegram_chat_id = null, updated_at = now()
    where telegram_chat_id = ${chatId}
  `

  const updated = (await sql`
    update subscribers
    set telegram_chat_id = ${chatId}, updated_at = now()
    where id = ${hit.subscriber_id}
    returning *
  `) as SubscriberRow[]

  await sql`delete from subscriber_telegram_link_codes where code = ${code.trim().toLowerCase()}`

  return updated[0] ?? null
}

export async function findSubscriberByTelegramChat(
  chatId: string,
): Promise<SubscriberRow | null> {
  const sql = getSql()
  const rows = (await sql`
    select * from subscribers where telegram_chat_id = ${chatId} limit 1
  `) as SubscriberRow[]
  return rows[0] ?? null
}

export async function unlinkTelegram(subscriberId: string) {
  const sql = getSql()
  await sql`
    update subscribers set telegram_chat_id = null, updated_at = now()
    where id = ${subscriberId}
  `
}

export async function pushBriefingToTelegram(subscriber: SubscriberRow, text: string) {
  if (!subscriber.telegram_chat_id) return { sent: false as const, reason: 'no_chat' }
  const token = process.env.TELEGRAM_PRO_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN
  if (!token) return { sent: false as const, reason: 'no_token' }
  await sendTelegramMessage(subscriber.telegram_chat_id, text, token)
  return { sent: true as const }
}
