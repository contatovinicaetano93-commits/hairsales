import { describe, expect, it } from 'vitest'
import type Stripe from 'stripe'
import { defaultBillingPortalFeatures, isStripeConfigured, planFromStripeSubscription } from './stripe'

function subscriptionWithPrice(priceId: string): Stripe.Subscription {
  return {
    items: {
      data: [{ price: { id: priceId } }],
    },
  } as Stripe.Subscription
}

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

  it('identifica o plano da assinatura pelos price IDs configurados', () => {
    const prevStandard = process.env.STRIPE_PRICE_STANDARD
    const prevPro = process.env.STRIPE_PRICE_PRO
    process.env.STRIPE_PRICE_STANDARD = 'price_standard'
    process.env.STRIPE_PRICE_PRO = 'price_pro'

    try {
      expect(planFromStripeSubscription(subscriptionWithPrice('price_standard'))).toBe('standard')
      expect(planFromStripeSubscription(subscriptionWithPrice('price_pro'))).toBe('pro')
      expect(planFromStripeSubscription(subscriptionWithPrice('price_other'))).toBeNull()
    } finally {
      if (prevStandard === undefined) delete process.env.STRIPE_PRICE_STANDARD
      else process.env.STRIPE_PRICE_STANDARD = prevStandard
      if (prevPro === undefined) delete process.env.STRIPE_PRICE_PRO
      else process.env.STRIPE_PRICE_PRO = prevPro
    }
  })
})
