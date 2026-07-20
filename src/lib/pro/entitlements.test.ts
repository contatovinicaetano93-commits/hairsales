import { describe, expect, it, vi } from 'vitest'
import {
  EntitlementError,
  assertCan,
  can,
  checkCan,
  type Capability,
  type EntitledSubscriber,
} from '@/lib/pro/entitlements'

function subscriber(
  overrides: Partial<EntitledSubscriber> = {},
): EntitledSubscriber {
  return {
    plan: 'standard',
    subscription_status: 'active',
    stripe_customer_id: null,
    ...overrides,
  }
}

describe('entitlements', () => {
  it('allows core app capabilities for Standard and Pro when active or demo', () => {
    const capabilities: Capability[] = ['assistant', 'telegram', 'agenda_sync']

    for (const plan of ['standard', 'pro'] as const) {
      for (const subscription_status of ['active', 'none'] as const) {
        for (const capability of capabilities) {
          expect(can(subscriber({ plan, subscription_status }), capability)).toBe(true)
        }
      }
    }
  })

  it('blocks demo-only core capabilities in production unless explicitly enabled', () => {
    const prevAllowDemo = process.env.PRO_ALLOW_DEMO_ENTITLEMENTS

    try {
      vi.stubEnv('NODE_ENV', 'production')
      delete process.env.PRO_ALLOW_DEMO_ENTITLEMENTS

      const demo = subscriber({ subscription_status: 'none' })
      expect(can(demo, 'assistant')).toBe(false)
      expect(can(demo, 'telegram')).toBe(false)
      expect(can(demo, 'agenda_sync')).toBe(false)

      process.env.PRO_ALLOW_DEMO_ENTITLEMENTS = '1'
      expect(can(demo, 'assistant')).toBe(true)
      expect(can(demo, 'telegram')).toBe(true)
      expect(can(demo, 'agenda_sync')).toBe(true)
    } finally {
      vi.unstubAllEnvs()
      if (prevAllowDemo === undefined) delete process.env.PRO_ALLOW_DEMO_ENTITLEMENTS
      else process.env.PRO_ALLOW_DEMO_ENTITLEMENTS = prevAllowDemo
    }
  })

  it('keeps basic Standard assistant and agenda available after billing trouble', () => {
    for (const subscription_status of ['canceled', 'past_due'] as const) {
      const sub = subscriber({ plan: 'standard', subscription_status })

      expect(can(sub, 'assistant')).toBe(true)
      expect(can(sub, 'agenda_sync')).toBe(true)
      expect(can(sub, 'telegram')).toBe(false)
    }
  })

  it('requires active Pro for WhatsApp Cloud and marketing packs', () => {
    expect(can(subscriber({ plan: 'pro', subscription_status: 'active' }), 'whatsapp_cloud')).toBe(
      true,
    )
    expect(can(subscriber({ plan: 'pro', subscription_status: 'active' }), 'marketing_packs')).toBe(
      true,
    )

    for (const subscription_status of ['none', 'canceled', 'past_due'] as const) {
      expect(can(subscriber({ plan: 'pro', subscription_status }), 'whatsapp_cloud')).toBe(false)
      expect(can(subscriber({ plan: 'pro', subscription_status }), 'marketing_packs')).toBe(false)
    }

    expect(can(subscriber({ plan: 'standard', subscription_status: 'active' }), 'whatsapp_cloud')).toBe(
      false,
    )
    expect(can(subscriber({ plan: 'standard', subscription_status: 'active' }), 'marketing_packs')).toBe(
      false,
    )
  })

  it('allows the billing portal only when a Stripe customer exists', () => {
    expect(can(subscriber({ stripe_customer_id: 'cus_123' }), 'billing_portal')).toBe(true)
    expect(can(subscriber({ stripe_customer_id: '   ' }), 'billing_portal')).toBe(false)
    expect(can(subscriber({ stripe_customer_id: null }), 'billing_portal')).toBe(false)
  })

  it('returns result objects and throws typed errors for denied capabilities', () => {
    const result = checkCan(
      subscriber({ plan: 'standard', subscription_status: 'active' }),
      'marketing_packs',
    )

    expect(result).toEqual({
      ok: false,
      capability: 'marketing_packs',
      message: 'Créditos extras de mensagens estão disponíveis apenas no plano Pro ativo.',
    })
    expect(() =>
      assertCan(subscriber({ plan: 'standard', subscription_status: 'active' }), 'whatsapp_cloud'),
    ).toThrow(EntitlementError)
  })
})
