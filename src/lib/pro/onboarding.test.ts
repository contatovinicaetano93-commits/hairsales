import { describe, expect, it, vi } from 'vitest'
import { buildOnboardingAiTip, computeOnboardingStatus, type OnboardingStep } from './onboarding'

const askAIMock = vi.fn()
vi.mock('@/lib/ai/client', () => ({
  askAI: (...args: unknown[]) => askAIMock(...args),
}))

function baseInput(overrides: Partial<Parameters<typeof computeOnboardingStatus>[0]> = {}) {
  return {
    email: 'pro@example.com',
    plan: 'standard',
    daily_goal_revenue: null,
    weekly_goal_revenue: null,
    telegram_chat_id: null,
    stripe_customer_id: null,
    connection: null,
    whatsapp_active: false,
    utility_sent: 0,
    utility_included: 200,
    marketing_remaining: 0,
    embedded_enabled: false,
    stripe_enabled: false,
    ai_daily_remaining: 40,
    ...overrides,
  }
}

describe('computeOnboardingStatus', () => {
  it('marca agenda como required e bloqueia ready_for_day sem conexão', () => {
    const status = computeOnboardingStatus(baseInput())
    const agenda = status.steps.find((s) => s.id === 'agenda') as OnboardingStep
    expect(agenda.required).toBe(true)
    expect(agenda.done).toBe(false)
    expect(status.ready_for_day).toBe(false)
    expect(status.completed).toBe(1) // só account
  })

  it('libera ready_for_day após agenda ativa', () => {
    const status = computeOnboardingStatus(
      baseInput({
        connection: {
          status: 'active',
          provider: 'avec',
          professional_name_matched: 'Dani Mariniello',
        },
      }),
    )
    expect(status.ready_for_day).toBe(true)
    expect(status.steps.find((s) => s.id === 'agenda')?.done).toBe(true)
    expect(status.percent).toBeGreaterThanOrEqual(33)
  })

  it('marca metas e telegram quando preenchidos', () => {
    const status = computeOnboardingStatus(
      baseInput({
        connection: {
          status: 'active',
          provider: 'avec',
          professional_name_matched: 'Dani',
        },
        daily_goal_revenue: 800,
        telegram_chat_id: '123',
      }),
    )
    expect(status.steps.find((s) => s.id === 'goals')?.done).toBe(true)
    expect(status.steps.find((s) => s.id === 'telegram')?.done).toBe(true)
    expect(status.completed).toBe(4)
  })

  it('whatsapp só aparece liberado no Pro', () => {
    const standard = computeOnboardingStatus(baseInput({ plan: 'standard' }))
    expect(standard.steps.find((s) => s.id === 'whatsapp')?.detail).toContain('Pro')

    const pro = computeOnboardingStatus(baseInput({ plan: 'pro', whatsapp_active: true }))
    expect(pro.steps.find((s) => s.id === 'plan_pro')?.done).toBe(true)
    expect(pro.steps.find((s) => s.id === 'whatsapp')?.done).toBe(true)
  })

  it('ai_tip é null por padrão quando não informado', () => {
    const status = computeOnboardingStatus(baseInput())
    expect(status.ai_tip).toBeNull()
  })
})

describe('buildOnboardingAiTip', () => {
  it('retorna null quando não há passo obrigatório pendente', async () => {
    const status = computeOnboardingStatus(
      baseInput({
        connection: { status: 'active', provider: 'avec', professional_name_matched: 'Dani' },
      }),
    )
    const tip = await buildOnboardingAiTip(status.steps)
    expect(tip).toBeNull()
    expect(askAIMock).not.toHaveBeenCalled()
  })

  it('retorna a dica da IA quando askAI responde com sucesso', async () => {
    askAIMock.mockResolvedValueOnce('Conecte sua agenda primeiro — sem isso a Hoje fica vazia.')
    const status = computeOnboardingStatus(baseInput())
    const tip = await buildOnboardingAiTip(status.steps)
    expect(tip).toBe('Conecte sua agenda primeiro — sem isso a Hoje fica vazia.')
    expect(askAIMock).toHaveBeenCalledTimes(1)
  })

  it('cai no fallback estático Pro (sem branding Vitrini/ROM) quando askAI falha', async () => {
    askAIMock.mockRejectedValueOnce(new Error('boom'))
    const status = computeOnboardingStatus(baseInput())
    const tip = await buildOnboardingAiTip(status.steps)
    expect(tip).toBe('Conecte sua agenda pra começar.')
    expect(tip).not.toMatch(/Vitrini|ROM/i)
  })

  it('usa o fallback estático passado a askAI (não o fallback default do client)', async () => {
    askAIMock.mockImplementationOnce(
      async (_system: string, _msg: string, fallback: () => string) => fallback(),
    )
    const status = computeOnboardingStatus(baseInput())
    const tip = await buildOnboardingAiTip(status.steps)
    expect(tip).toBe('Conecte sua agenda pra começar.')
  })

  it('cacheia por subscriber (não chama askAI de novo pros mesmos passos pendentes)', async () => {
    askAIMock.mockResolvedValueOnce('Dica gerada uma vez.')
    const status = computeOnboardingStatus(baseInput())
    const callsBefore = askAIMock.mock.calls.length

    const first = await buildOnboardingAiTip(status.steps, 'subscriber-cache-1')
    const second = await buildOnboardingAiTip(status.steps, 'subscriber-cache-1')

    expect(first).toBe('Dica gerada uma vez.')
    expect(second).toBe('Dica gerada uma vez.')
    expect(askAIMock.mock.calls.length - callsBefore).toBe(1)
  })

  it('não cacheia entre assinantes diferentes', async () => {
    askAIMock.mockResolvedValueOnce('Dica do assinante A.')
    askAIMock.mockResolvedValueOnce('Dica do assinante B.')
    const status = computeOnboardingStatus(baseInput())
    const callsBefore = askAIMock.mock.calls.length

    const a = await buildOnboardingAiTip(status.steps, 'subscriber-cache-a')
    const b = await buildOnboardingAiTip(status.steps, 'subscriber-cache-b')

    expect(a).toBe('Dica do assinante A.')
    expect(b).toBe('Dica do assinante B.')
    expect(askAIMock.mock.calls.length - callsBefore).toBe(2)
  })
})
