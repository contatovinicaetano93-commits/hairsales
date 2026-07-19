import { getSql } from '@/lib/db'
import { todayIso } from '@/lib/salon/format'
import type { SubscriberPlan } from '@/lib/pro/subscribers'

/** Unidades de IA — alinhado ao plano Standard/Pro validado. */
export const AI_UNIT_COST = {
  question: 1,
  client_brief: 2,
  briefing: 5,
} as const

export type AiAction = keyof typeof AI_UNIT_COST

const DAILY_LIMIT: Record<SubscriberPlan, number> = {
  standard: 40,
  pro: 150,
}

const MONTHLY_LIMIT: Record<SubscriberPlan, number> = {
  standard: 1000,
  pro: 4000,
}

export interface QuotaStatus {
  plan: SubscriberPlan
  day: string
  daily_limit: number
  daily_used: number
  daily_remaining: number
  monthly_limit: number
  monthly_used: number
  monthly_remaining: number
  briefing_done_today: boolean
}

function monthStartIso() {
  const d = todayIso()
  return `${d.slice(0, 7)}-01`
}

export async function getQuotaStatus(
  subscriberId: string,
  plan: SubscriberPlan,
): Promise<QuotaStatus> {
  const sql = getSql()
  const day = todayIso()
  const monthStart = monthStartIso()

  const dayRows = (await sql`
    select units_used, briefing_done from subscriber_ai_usage
    where subscriber_id = ${subscriberId} and day = ${day}
    limit 1
  `) as { units_used: number; briefing_done: boolean }[]

  const monthRows = (await sql`
    select coalesce(sum(units_used), 0)::int as units_used
    from subscriber_ai_usage
    where subscriber_id = ${subscriberId} and day >= ${monthStart}
  `) as { units_used: number }[]

  const dailyUsed = dayRows[0]?.units_used ?? 0
  const monthlyUsed = monthRows[0]?.units_used ?? 0
  const dailyLimit = DAILY_LIMIT[plan]
  const monthlyLimit = MONTHLY_LIMIT[plan]

  return {
    plan,
    day,
    daily_limit: dailyLimit,
    daily_used: dailyUsed,
    daily_remaining: Math.max(0, dailyLimit - dailyUsed),
    monthly_limit: monthlyLimit,
    monthly_used: monthlyUsed,
    monthly_remaining: Math.max(0, monthlyLimit - monthlyUsed),
    briefing_done_today: dayRows[0]?.briefing_done ?? false,
  }
}

export class QuotaExceededError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'QuotaExceededError'
  }
}

export function isProAiDisabled(): boolean {
  const value = process.env.PRO_AI_DISABLED?.trim().toLowerCase()
  return value === '1' || value === 'true'
}

function dailyQuotaMessage(status: QuotaStatus): string {
  return `Cota diária de IA esgotada (${status.daily_used}/${status.daily_limit}). Seus KPIs e agenda continuam disponíveis.`
}

function monthlyQuotaMessage(status: QuotaStatus): string {
  return `Cota mensal de IA esgotada (${status.monthly_used}/${status.monthly_limit}).`
}

/** Reserva unidades. Lança QuotaExceededError se não houver saldo. */
export async function consumeAiUnits(
  subscriberId: string,
  plan: SubscriberPlan,
  action: AiAction,
  opts?: { markBriefing?: boolean },
): Promise<{ units: number; status: QuotaStatus }> {
  if (isProAiDisabled()) {
    throw new QuotaExceededError('Assistente temporariamente indisponível. Tente novamente em alguns minutos.')
  }

  const units = AI_UNIT_COST[action]
  const sql = getSql()
  const day = todayIso()
  const monthStart = monthStartIso()
  const dailyLimit = DAILY_LIMIT[plan]
  const monthlyLimit = MONTHLY_LIMIT[plan]
  const markBriefing = opts?.markBriefing === true

  const consumed = (await sql`
    with month_before_today as (
      select coalesce(sum(units_used), 0)::int as units_used
      from subscriber_ai_usage
      where subscriber_id = ${subscriberId}
        and day >= ${monthStart}
        and day < ${day}
    )
    insert into subscriber_ai_usage (subscriber_id, day, units_used, briefing_done, updated_at)
    select
      ${subscriberId},
      ${day},
      ${units},
      ${markBriefing},
      now()
    from month_before_today
    where ${units} <= ${dailyLimit}
      and month_before_today.units_used + ${units} <= ${monthlyLimit}
    on conflict (subscriber_id, day) do update set
      units_used = subscriber_ai_usage.units_used + excluded.units_used,
      briefing_done = subscriber_ai_usage.briefing_done or excluded.briefing_done,
      updated_at = now()
    where subscriber_ai_usage.units_used + excluded.units_used <= ${dailyLimit}
      and (select units_used from month_before_today) + subscriber_ai_usage.units_used + excluded.units_used <= ${monthlyLimit}
    returning
      units_used,
      briefing_done,
      (select units_used from month_before_today)::int as month_before_today
  `) as { units_used: number; briefing_done: boolean; month_before_today: number }[]

  if (consumed.length === 0) {
    const status = await getQuotaStatus(subscriberId, plan)
    if (status.daily_remaining < units) {
      throw new QuotaExceededError(dailyQuotaMessage(status))
    }
    if (status.monthly_remaining < units) {
      throw new QuotaExceededError(monthlyQuotaMessage(status))
    }
    throw new QuotaExceededError('Não foi possível reservar a cota de IA agora. Tente novamente em instantes.')
  }

  return { units, status: await getQuotaStatus(subscriberId, plan) }
}

/** Devolve unidades reservadas quando o caminho de IA não gera resposta. */
export async function refundAiUnits(
  subscriberId: string,
  units: number,
  day = todayIso(),
): Promise<void> {
  const refundUnits = Math.floor(units)
  if (!Number.isFinite(refundUnits) || refundUnits <= 0) return

  const sql = getSql()
  await sql`
    update subscriber_ai_usage
    set units_used = greatest(0, units_used - ${refundUnits}),
        updated_at = now()
    where subscriber_id = ${subscriberId}
      and day = ${day}
  `
}
