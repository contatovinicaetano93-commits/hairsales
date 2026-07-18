import { describe, expect, it } from 'vitest'
import { computeOnboardingStatus, type OnboardingStep } from './onboarding'

function baseInput(overrides: Partial<Parameters<typeof computeOnboardingStatus>[0]> = {}) {
  return {
    email: 'pro@example.com',
    plan: 'free',
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
    const free = computeOnboardingStatus(baseInput({ plan: 'free' }))
    expect(free.steps.find((s) => s.id === 'whatsapp')?.detail).toContain('Pro')

    const pro = computeOnboardingStatus(baseInput({ plan: 'pro', whatsapp_active: true }))
    expect(pro.steps.find((s) => s.id === 'plan_pro')?.done).toBe(true)
    expect(pro.steps.find((s) => s.id === 'whatsapp')?.done).toBe(true)
  })
})
