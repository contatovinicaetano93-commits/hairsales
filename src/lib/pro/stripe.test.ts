import { describe, expect, it } from 'vitest'
import { isStripeConfigured } from './stripe'

describe('stripe config', () => {
  it('reporta desligado sem STRIPE_SECRET_KEY', () => {
    const prev = process.env.STRIPE_SECRET_KEY
    delete process.env.STRIPE_SECRET_KEY
    expect(isStripeConfigured()).toBe(false)
    if (prev !== undefined) process.env.STRIPE_SECRET_KEY = prev
  })
})
