import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  AI_UNIT_COST,
  consumeAiUnits,
  isProAiDisabled,
  QuotaExceededError,
} from './quotas'

type UsageRow = {
  units_used: number
  briefing_done: boolean
}

type SqlTag = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown[]>

const sqlMock = vi.hoisted(() => vi.fn<SqlTag>())

vi.mock('@/lib/db', () => ({
  getSql: () => sqlMock,
}))

vi.mock('@/lib/salon/format', () => ({
  todayIso: () => '2026-07-19',
}))

const SUBSCRIBER_ID = '00000000-0000-4000-8000-000000000001'
const TODAY = '2026-07-19'
const MONTH_START = '2026-07-01'

let usage: Map<string, UsageRow>
let sqlQueue: Promise<void>

function usageKey(subscriberId: string, day: string): string {
  return `${subscriberId}:${day}`
}

function cloneRow(row: UsageRow): UsageRow {
  return { units_used: row.units_used, briefing_done: row.briefing_done }
}

function getUsage(subscriberId: string, day: string): UsageRow | undefined {
  const row = usage.get(usageKey(subscriberId, day))
  return row ? cloneRow(row) : undefined
}

function setUsage(subscriberId: string, day: string, row: UsageRow): void {
  usage.set(usageKey(subscriberId, day), cloneRow(row))
}

function sumUsage(subscriberId: string, fromDay: string, beforeDay?: string): number {
  let total = 0
  for (const [key, row] of usage.entries()) {
    const [rowSubscriberId, day] = key.split(':')
    if (rowSubscriberId !== subscriberId) continue
    if (day < fromDay) continue
    if (beforeDay && day >= beforeDay) continue
    total += row.units_used
  }
  return total
}

async function runSerial<T>(operation: () => Promise<T> | T): Promise<T> {
  const current = sqlQueue.then(operation, operation)
  sqlQueue = current.then(
    () => undefined,
    () => undefined,
  )
  return current
}

function installSqlMock(): void {
  sqlMock.mockImplementation(async (strings, ...values) => {
    const query = strings.join(' ').toLowerCase()

    if (query.includes('insert into subscriber_ai_usage')) {
      return runSerial(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0))

        const subscriberId = values[0] as string
        const monthStart = values[1] as string
        const day = values[2] as string
        const units = values[5] as number
        const markBriefing = values[6] as boolean
        const dailyLimit = values[8] as number
        const monthlyLimit = values[10] as number
        const monthBeforeToday = sumUsage(subscriberId, monthStart, day)
        const existing = getUsage(subscriberId, day)
        const currentDayUsage = existing?.units_used ?? 0
        const nextDayUsage = currentDayUsage + units

        if (
          units > dailyLimit ||
          monthBeforeToday + units > monthlyLimit ||
          nextDayUsage > dailyLimit ||
          monthBeforeToday + nextDayUsage > monthlyLimit
        ) {
          return []
        }

        const nextRow = {
          units_used: nextDayUsage,
          briefing_done: (existing?.briefing_done ?? false) || markBriefing,
        }
        setUsage(subscriberId, day, nextRow)

        return [
          {
            ...nextRow,
            month_before_today: monthBeforeToday,
          },
        ]
      })
    }

    if (query.includes('select units_used, briefing_done')) {
      const subscriberId = values[0] as string
      const day = values[1] as string
      const row = getUsage(subscriberId, day)
      return row ? [row] : []
    }

    if (query.includes('select coalesce(sum(units_used), 0)::int as units_used')) {
      const subscriberId = values[0] as string
      const monthStart = values[1] as string
      return [{ units_used: sumUsage(subscriberId, monthStart) }]
    }

    throw new Error(`SQL não mapeado no teste: ${query}`)
  })
}

beforeEach(() => {
  delete process.env.PRO_AI_DISABLED
  usage = new Map()
  sqlQueue = Promise.resolve()
  sqlMock.mockReset()
  installSqlMock()
})

describe('AI_UNIT_COST', () => {
  it('mantém custos do plano Standard/Pro', () => {
    expect(AI_UNIT_COST.question).toBe(1)
    expect(AI_UNIT_COST.client_brief).toBe(2)
    expect(AI_UNIT_COST.briefing).toBe(5)
  })
})

describe('isProAiDisabled', () => {
  it('reconhece o kill-switch por env', () => {
    process.env.PRO_AI_DISABLED = '1'
    expect(isProAiDisabled()).toBe(true)

    process.env.PRO_AI_DISABLED = 'true'
    expect(isProAiDisabled()).toBe(true)

    process.env.PRO_AI_DISABLED = '0'
    expect(isProAiDisabled()).toBe(false)
  })
})

describe('consumeAiUnits', () => {
  it('bloqueia consumo sem tocar no banco quando PRO_AI_DISABLED está ativo', async () => {
    process.env.PRO_AI_DISABLED = 'true'

    await expect(consumeAiUnits(SUBSCRIBER_ID, 'standard', 'question')).rejects.toMatchObject({
      name: 'QuotaExceededError',
      message: expect.stringContaining('Assistente temporariamente indisponível'),
    })
    expect(sqlMock).not.toHaveBeenCalled()
  })

  it('permite só um consumo concorrente quando resta uma unidade diária', async () => {
    setUsage(SUBSCRIBER_ID, TODAY, { units_used: 39, briefing_done: false })

    const attempts = await Promise.allSettled([
      consumeAiUnits(SUBSCRIBER_ID, 'standard', 'question'),
      consumeAiUnits(SUBSCRIBER_ID, 'standard', 'question'),
    ])
    const successes = attempts.filter((result) => result.status === 'fulfilled')
    const failures = attempts.filter((result) => result.status === 'rejected')

    expect(successes).toHaveLength(1)
    expect(failures).toHaveLength(1)
    expect(getUsage(SUBSCRIBER_ID, TODAY)?.units_used).toBe(40)

    const failure = failures[0]
    if (failure?.status !== 'rejected') throw new Error('esperava uma falha de cota')
    expect(failure.reason).toBeInstanceOf(QuotaExceededError)
    expect(failure.reason.message).toContain('Cota diária de IA esgotada')
  })

  it('não consome quando a soma mensal excederia o limite', async () => {
    setUsage(SUBSCRIBER_ID, MONTH_START, { units_used: 999, briefing_done: false })

    await expect(consumeAiUnits(SUBSCRIBER_ID, 'standard', 'client_brief')).rejects.toMatchObject({
      name: 'QuotaExceededError',
      message: expect.stringContaining('Cota mensal de IA esgotada'),
    })

    expect(getUsage(SUBSCRIBER_ID, TODAY)).toBeUndefined()
  })

  it('marca briefing junto com o consumo permitido', async () => {
    const result = await consumeAiUnits(SUBSCRIBER_ID, 'standard', 'briefing', {
      markBriefing: true,
    })

    expect(result.units).toBe(5)
    expect(result.status.briefing_done_today).toBe(true)
    expect(getUsage(SUBSCRIBER_ID, TODAY)).toEqual({
      units_used: 5,
      briefing_done: true,
    })
  })
})
