import { describe, expect, it } from 'vitest'
import { defaultBillingPortalFeatures, isStripeConfigured } from './stripe'

describe('stripe config', () => {
  it('reporta desligado sem STRIPE_SECRET_KEY', () => {
    const prev = process.env.STRIPE_SECRET_KEY
    delete process.env.STRIPE_SECRET_KEY
    expect(isStripeConfigured()).toBe(false)
    if (prev !== undefined) process.env.STRIPE_SECRET_KEY = prev
  })

  it('define features do Customer Portal com cancelamento e invoices', () => {
    const features = defaultBillingPortalFeatures()
    expect(features.invoice_history?.enabled).toBe(true)
    expect(features.payment_method_update?.enabled).toBe(true)
    expect(features.subscription_cancel?.enabled).toBe(true)
    expect(features.subscription_cancel?.mode).toBe('at_period_end')
    expect(features.subscription_update?.enabled).toBe(false)
  })
})
