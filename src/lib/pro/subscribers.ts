import { getSql } from '@/lib/db'
import { decryptSecret, encryptSecret, hashPassword, verifyPassword } from '@/lib/pro/crypto'
import type { AgendaProviderId } from '@/lib/providers/types'

export type SubscriberPlan = 'standard' | 'pro'
export type SubscriptionStatus = 'none' | 'active' | 'canceled' | 'past_due'
export type ConnectionStatus = 'pending' | 'active' | 'error' | 'disconnected'

export interface SubscriberRow {
  id: string
  display_name: string
  email: string
  password_hash: string
  plan: SubscriberPlan
  subscription_status: SubscriptionStatus
  daily_goal_revenue: number | null
  weekly_goal_revenue: number | null
  telegram_chat_id?: string | null
  marketing_credits?: number | null
  stripe_customer_id?: string | null
  created_at: string
  updated_at: string
}

export interface SubscriberConnectionRow {
  id: string
  subscriber_id: string
  provider: AgendaProviderId
  api_token_encrypted: string | null
  unit_external_id: string | null
  professional_external_id: string | null
  professional_name_matched: string | null
  name_aliases: string[]
  status: ConnectionStatus
  last_sync_at: string | null
  last_error: string | null
  created_at: string
  updated_at: string
}

export async function createSubscriber(input: {
  displayName: string
  email: string
  password: string
  plan?: SubscriberPlan
  subscription_status?: SubscriptionStatus
  stripeCustomerId?: string | null
}): Promise<SubscriberRow> {
  const sql = getSql()
  const passwordHash = await hashPassword(input.password)
  const plan = input.plan ?? 'standard'
  const subscriptionStatus = input.subscription_status ?? 'none'
  const stripeCustomerId = input.stripeCustomerId?.trim() || null
  const rows = (await sql`
    insert into subscribers (
      display_name, email, password_hash, plan, subscription_status, stripe_customer_id
    )
    values (
      ${input.displayName.trim()},
      ${input.email.trim().toLowerCase()},
      ${passwordHash},
      ${plan},
      ${subscriptionStatus},
      ${stripeCustomerId}
    )
    returning *
  `) as SubscriberRow[]
  return rows[0]!
}

export async function findSubscriberByEmail(email: string): Promise<SubscriberRow | null> {
  const sql = getSql()
  const rows = (await sql`
    select * from subscribers where lower(email) = lower(${email.trim()}) limit 1
  `) as SubscriberRow[]
  return rows[0] ?? null
}

export async function findSubscriberById(id: string): Promise<SubscriberRow | null> {
  const sql = getSql()
  const rows = (await sql`
    select * from subscribers where id = ${id} limit 1
  `) as SubscriberRow[]
  return rows[0] ?? null
}

export async function authenticateSubscriber(
  email: string,
  password: string,
): Promise<SubscriberRow | null> {
  const sub = await findSubscriberByEmail(email)
  if (!sub) return null
  const ok = await verifyPassword(password, sub.password_hash)
  return ok ? sub : null
}

export function isProPlan(plan: SubscriberPlan): boolean {
  return plan === 'pro'
}

export function hasActiveSubscription(subscriber: SubscriberRow): boolean {
  return subscriber.subscription_status === 'active'
}

export async function updateSubscriberDisplayName(id: string, displayName: string) {
  const sql = getSql()
  await sql`
    update subscribers
    set display_name = ${displayName.trim()}, updated_at = now()
    where id = ${id}
  `
}

/** Define metas; passe null para limpar. */
export async function setSubscriberGoals(
  id: string,
  daily: number | null,
  weekly: number | null,
): Promise<SubscriberRow> {
  const sql = getSql()
  const rows = (await sql`
    update subscribers set
      daily_goal_revenue = ${daily},
      weekly_goal_revenue = ${weekly},
      updated_at = now()
    where id = ${id}
    returning *
  `) as SubscriberRow[]
  return rows[0]!
}

export async function getActiveConnection(
  subscriberId: string,
): Promise<SubscriberConnectionRow | null> {
  const sql = getSql()
  const rows = (await sql`
    select * from subscriber_connections
    where subscriber_id = ${subscriberId} and status = 'active'
    order by updated_at desc
    limit 1
  `) as SubscriberConnectionRow[]
  return rows[0] ?? null
}

export async function getConnection(
  subscriberId: string,
  provider: AgendaProviderId,
): Promise<SubscriberConnectionRow | null> {
  const sql = getSql()
  const rows = (await sql`
    select * from subscriber_connections
    where subscriber_id = ${subscriberId} and provider = ${provider}
    limit 1
  `) as SubscriberConnectionRow[]
  return rows[0] ?? null
}

export async function upsertConnection(input: {
  subscriberId: string
  provider: AgendaProviderId
  apiToken: string
  unitExternalId?: string | null
  professionalExternalId?: string | null
  professionalNameMatched: string
  nameAliases: string[]
  status: ConnectionStatus
  lastError?: string | null
}): Promise<SubscriberConnectionRow> {
  const sql = getSql()
  const encrypted = encryptSecret(input.apiToken)
  const aliases = input.nameAliases.length > 0 ? input.nameAliases : [input.professionalNameMatched]
  const rows = (await sql`
    insert into subscriber_connections (
      subscriber_id, provider, api_token_encrypted, unit_external_id,
      professional_external_id, professional_name_matched, name_aliases,
      status, last_error, updated_at
    ) values (
      ${input.subscriberId},
      ${input.provider},
      ${encrypted},
      ${input.unitExternalId?.trim() || null},
      ${input.professionalExternalId},
      ${input.professionalNameMatched},
      ${aliases},
      ${input.status},
      ${input.lastError ?? null},
      now()
    )
    on conflict (subscriber_id, provider) do update set
      api_token_encrypted = excluded.api_token_encrypted,
      unit_external_id = excluded.unit_external_id,
      professional_external_id = excluded.professional_external_id,
      professional_name_matched = excluded.professional_name_matched,
      name_aliases = excluded.name_aliases,
      status = excluded.status,
      last_error = excluded.last_error,
      updated_at = now()
    returning *
  `) as SubscriberConnectionRow[]
  return rows[0]!
}

export async function markConnectionError(subscriberId: string, provider: AgendaProviderId, error: string) {
  const sql = getSql()
  await sql`
    update subscriber_connections
    set status = 'error', last_error = ${error}, updated_at = now()
    where subscriber_id = ${subscriberId} and provider = ${provider}
  `
}

export async function markConnectionSynced(connectionId: string) {
  const sql = getSql()
  await sql`
    update subscriber_connections
    set last_sync_at = now(), last_error = null, status = 'active', updated_at = now()
    where id = ${connectionId}
  `
}

export function connectionToken(conn: SubscriberConnectionRow): string {
  if (!conn.api_token_encrypted) throw new Error('Conexão sem token')
  return decryptSecret(conn.api_token_encrypted)
}

export function connectionProfessional(conn: SubscriberConnectionRow): {
  externalId: string | null
  canonicalName: string
  aliases: string[]
} {
  const canonical = conn.professional_name_matched?.trim()
  if (!canonical) throw new Error('Conexão sem profissional resolvido')
  return {
    externalId: conn.professional_external_id,
    canonicalName: canonical,
    aliases: conn.name_aliases?.length ? conn.name_aliases : [canonical],
  }
}
