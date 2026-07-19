import { existsSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PRO_PLAN_OFFERS } from './plan-catalog'
import { getProDataSecret } from './secrets'

const PRO_MODULE_DIR = path.join(process.cwd(), 'src/lib/pro')
const OPTIONAL_MODULES = {
  entitlements: path.join(PRO_MODULE_DIR, 'entitlements.ts'),
  billingEvents: path.join(PRO_MODULE_DIR, 'billing-events.ts'),
  rateLimit: path.join(PRO_MODULE_DIR, 'rate-limit.ts'),
} as const

async function importOptionalModule<T>(absolutePath: string): Promise<T> {
  // These files are being developed on sibling branches, so keep resolution runtime-only.
  return import(/* @vite-ignore */ pathToFileURL(absolutePath).href) as Promise<T>
}

describe('HairSales resilience checklist', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('does not use CRON_SECRET as the Pro data/session secret', () => {
    vi.stubEnv('NODE_ENV', 'test')
    vi.stubEnv('PRO_DATA_SECRET', '')
    vi.stubEnv('CRON_SECRET', 'cron-secret-must-not-sign-pro-data')

    expect(getProDataSecret()).not.toBe('cron-secret-must-not-sign-pro-data')
  })

  it('keeps the Standard public plan mapped to the standard database plan', () => {
    expect(PRO_PLAN_OFFERS.standard.dbPlan).toBe('standard')
  })

  it.skipIf(!existsSync(OPTIONAL_MODULES.entitlements))(
    'smoke-tests optional entitlements.can when present',
    async () => {
      const mod = await importOptionalModule<{ can?: (...args: unknown[]) => unknown }>(
        OPTIONAL_MODULES.entitlements,
      )

      expect(typeof mod.can).toBe('function')
      const result = mod.can?.(
        { plan: 'pro', subscription_status: 'active' },
        'whatsapp_cloud',
      )
      expect(typeof result).toBe('boolean')
    },
  )

  it.skipIf(!existsSync(OPTIONAL_MODULES.billingEvents))(
    'smoke-tests optional billing event module exports when present',
    async () => {
      const mod = await importOptionalModule<Record<string, unknown>>(OPTIONAL_MODULES.billingEvents)
      const expectedExports = ['recordBillingEvent', 'logBillingEvent', 'appendBillingEvent']

      expect(expectedExports.some((name) => typeof mod[name] === 'function')).toBe(true)
    },
  )

  it.skipIf(!existsSync(OPTIONAL_MODULES.rateLimit))(
    'smoke-tests optional rate limit module exports when present',
    async () => {
      const mod = await importOptionalModule<Record<string, unknown>>(OPTIONAL_MODULES.rateLimit)
      const expectedExports = ['checkRateLimit', 'consumeRateLimit', 'withRateLimit', 'rateLimit']

      expect(expectedExports.some((name) => typeof mod[name] === 'function')).toBe(true)
    },
  )
})
