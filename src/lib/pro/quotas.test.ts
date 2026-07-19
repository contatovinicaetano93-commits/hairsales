import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AI_UNIT_COST, QuotaExceededError, consumeAiUnits } from './quotas'

const { sqlMock } = vi.hoisted(() => ({
  sqlMock: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  getSql: () => sqlMock,
}))

vi.mock('@/lib/salon/format', () => ({
  todayIso: () => '2026-07-19',
}))

describe('AI_UNIT_COST', () => {
  it('mantém custos do plano Standard/Pro', () => {
    expect(AI_UNIT_COST.question).toBe(1)
    expect(AI_UNIT_COST.client_brief).toBe(2)
    expect(AI_UNIT_COST.briefing).toBe(5)
  })
})

describe('QuotaExceededError', () => {
  beforeEach(() => {
    sqlMock.mockReset()
  })

  it('preserves a stable error name for quota handling', () => {
    const error = new QuotaExceededError('quota reached')

    expect(error).toBeInstanceOf(Error)
    expect(error.name).toBe('QuotaExceededError')
    expect(error.message).toBe('quota reached')
  })

  it('throws before writing when the daily quota cannot cover the action', async () => {
    sqlMock
      .mockResolvedValueOnce([{ units_used: 39, briefing_done: false }])
      .mockResolvedValueOnce([{ units_used: 39 }])

    let caught: unknown
    try {
      await consumeAiUnits('sub_123', 'standard', 'client_brief')
    } catch (e) {
      caught = e
    }

    expect(caught).toBeInstanceOf(QuotaExceededError)
    expect(caught).toMatchObject({
      name: 'QuotaExceededError',
      message: expect.stringContaining('Cota diária de IA esgotada'),
    })
    expect(sqlMock).toHaveBeenCalledTimes(2)
  })

  it('throws before writing when the monthly quota cannot cover the action', async () => {
    sqlMock
      .mockResolvedValueOnce([{ units_used: 0, briefing_done: false }])
      .mockResolvedValueOnce([{ units_used: 999 }])

    let caught: unknown
    try {
      await consumeAiUnits('sub_123', 'standard', 'client_brief')
    } catch (e) {
      caught = e
    }

    expect(caught).toBeInstanceOf(QuotaExceededError)
    expect(caught).toMatchObject({
      name: 'QuotaExceededError',
      message: expect.stringContaining('Cota mensal de IA esgotada'),
    })
    expect(sqlMock).toHaveBeenCalledTimes(2)
  })
})
