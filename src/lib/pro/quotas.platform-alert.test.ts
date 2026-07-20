import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const sqlMock = vi.fn()
const captureMessageMock = vi.fn()

vi.mock('@/lib/db', () => ({
  getSql: () => sqlMock,
}))

vi.mock('@/lib/observability', () => ({
  Observability: { captureMessage: (...args: unknown[]) => captureMessageMock(...args) },
}))

describe('checkPlatformAiSpend', () => {
  beforeEach(async () => {
    const { resetPlatformAiAlertForTests } = await import('./quotas')
    resetPlatformAiAlertForTests()
    sqlMock.mockReset()
    captureMessageMock.mockReset()
    delete process.env.PLATFORM_AI_DAILY_UNIT_CAP
  })

  afterEach(() => {
    delete process.env.PLATFORM_AI_DAILY_UNIT_CAP
  })

  it('não alerta quando o total do dia está abaixo do teto', async () => {
    process.env.PLATFORM_AI_DAILY_UNIT_CAP = '100'
    sqlMock.mockResolvedValueOnce([{ total: 50 }])
    const { checkPlatformAiSpend } = await import('./quotas')

    await checkPlatformAiSpend('2026-07-20')

    expect(captureMessageMock).not.toHaveBeenCalled()
  })

  it('alerta quando o total do dia atinge o teto', async () => {
    process.env.PLATFORM_AI_DAILY_UNIT_CAP = '100'
    sqlMock.mockResolvedValueOnce([{ total: 150 }])
    const { checkPlatformAiSpend } = await import('./quotas')

    await checkPlatformAiSpend('2026-07-20')

    expect(captureMessageMock).toHaveBeenCalledTimes(1)
    expect(captureMessageMock.mock.calls[0][0]).toContain('100')
    expect(captureMessageMock.mock.calls[0][1]).toBe('warning')
  })

  it('não repete o alerta no mesmo dia (debounce)', async () => {
    process.env.PLATFORM_AI_DAILY_UNIT_CAP = '100'
    sqlMock.mockResolvedValue([{ total: 200 }])
    const { checkPlatformAiSpend } = await import('./quotas')

    await checkPlatformAiSpend('2026-07-20')
    await checkPlatformAiSpend('2026-07-20')
    await checkPlatformAiSpend('2026-07-20')

    expect(captureMessageMock).toHaveBeenCalledTimes(1)
  })

  it('alerta de novo num dia diferente', async () => {
    process.env.PLATFORM_AI_DAILY_UNIT_CAP = '100'
    sqlMock.mockResolvedValue([{ total: 200 }])
    const { checkPlatformAiSpend } = await import('./quotas')

    await checkPlatformAiSpend('2026-07-20')
    await checkPlatformAiSpend('2026-07-21')

    expect(captureMessageMock).toHaveBeenCalledTimes(2)
  })

  it('nunca lança, mesmo se a query falhar', async () => {
    sqlMock.mockRejectedValueOnce(new Error('db offline'))
    const { checkPlatformAiSpend } = await import('./quotas')

    await expect(checkPlatformAiSpend('2026-07-20')).resolves.toBeUndefined()
    expect(captureMessageMock).not.toHaveBeenCalled()
  })

  it('usa o teto padrão (5000) quando PLATFORM_AI_DAILY_UNIT_CAP não está configurado', async () => {
    sqlMock.mockResolvedValueOnce([{ total: 5000 }])
    const { checkPlatformAiSpend } = await import('./quotas')

    await checkPlatformAiSpend('2026-07-20')

    expect(captureMessageMock).toHaveBeenCalledTimes(1)
    expect(captureMessageMock.mock.calls[0][0]).toContain('5000')
  })
})
