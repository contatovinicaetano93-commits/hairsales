import { afterEach, describe, expect, it, vi } from 'vitest'
import { PRO_PLAN_OFFERS, listProPlanOffers } from './plan-catalog'
import { getProDataSecret } from './secrets'
import { subscriptionStatusFromStripe } from './stripe'

describe('HairSales Pro architecture smoke checks', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('keeps Pro data signing isolated from cron authentication', () => {
    vi.stubEnv('NODE_ENV', 'test')
    vi.stubEnv('PRO_DATA_SECRET', 'pro-data-secret')
    vi.stubEnv('CRON_SECRET', 'cron-secret')

    expect(getProDataSecret()).toBe('pro-data-secret')
    expect(getProDataSecret()).not.toBe('cron-secret')
  })

  it('keeps the plan catalog shape stable for Standard and Pro', () => {
    expect(listProPlanOffers().map((plan) => plan.id)).toEqual(['standard', 'pro'])
    expect(PRO_PLAN_OFFERS.standard.dbPlan).toBe('standard')
    expect(PRO_PLAN_OFFERS.pro.dbPlan).toBe('pro')
  })

  it('keeps Stripe subscription status mappings within known subscriber states', () => {
    const subscriberStatuses = new Set([
      subscriptionStatusFromStripe('active'),
      subscriptionStatusFromStripe('trialing'),
      subscriptionStatusFromStripe('past_due'),
      subscriptionStatusFromStripe('canceled'),
      subscriptionStatusFromStripe('incomplete_expired'),
      subscriptionStatusFromStripe('unpaid'),
      subscriptionStatusFromStripe('incomplete'),
      subscriptionStatusFromStripe('paused'),
    ])

    expect(subscriberStatuses).toEqual(new Set(['active', 'past_due', 'canceled', 'none']))
  })
})
