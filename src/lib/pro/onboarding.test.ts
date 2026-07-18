import { describe, expect, it } from 'vitest'
import type { OnboardingStep } from './onboarding'

describe('onboarding steps shape', () => {
  it('marca agenda como required', () => {
    const step: OnboardingStep = {
      id: 'agenda',
      title: 'Conectar agenda',
      done: false,
      required: true,
      href: '/pro/conectar',
      detail: 'x',
    }
    expect(step.required).toBe(true)
    expect(step.id).toBe('agenda')
  })
})
