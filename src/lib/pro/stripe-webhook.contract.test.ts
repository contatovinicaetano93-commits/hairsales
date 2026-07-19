import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { subscriptionStatusFromStripe } from './stripe'

const STRIPE_WEBHOOK_ROUTE = path.join(process.cwd(), 'src/app/api/webhooks/stripe/route.ts')

describe('Stripe webhook contract', () => {
  it('keeps handling the paid-checkout and subscription lifecycle events', () => {
    const routeSource = readFileSync(STRIPE_WEBHOOK_ROUTE, 'utf8')

    expect(routeSource).toContain("case 'checkout.session.completed'")
    expect(routeSource).toContain("case 'customer.subscription.deleted'")
    expect(routeSource).toContain("case 'customer.subscription.updated'")
    expect(routeSource).toContain("case 'invoice.payment_failed'")
  })

  it('maps Stripe subscription statuses into persisted subscriber statuses', () => {
    expect(subscriptionStatusFromStripe('active')).toBe('active')
    expect(subscriptionStatusFromStripe('trialing')).toBe('active')
    expect(subscriptionStatusFromStripe('past_due')).toBe('past_due')
    expect(subscriptionStatusFromStripe('canceled')).toBe('canceled')
    expect(subscriptionStatusFromStripe('incomplete_expired')).toBe('canceled')
    expect(subscriptionStatusFromStripe('unpaid')).toBe('canceled')
    expect(subscriptionStatusFromStripe('incomplete')).toBe('none')
    expect(subscriptionStatusFromStripe('paused')).toBe('none')
  })
})
