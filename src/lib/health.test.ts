import { afterEach, describe, expect, it, vi } from 'vitest'
import { getHealthStatus } from '@/lib/health'

const sqlMock = vi.hoisted(() =>
  vi.fn(async (strings: TemplateStringsArray) => {
    const query = strings.join('')
    if (query.includes('salon_p1_daily')) {
      return [
        { layer: 'p1', n: 0 },
        { layer: 'p2', n: 0 },
        { layer: 'p3', n: 0 },
      ]
    }
    return [{ ok: 1 }]
  })
)

vi.mock('@/lib/db', () => ({
  getSql: () => sqlMock,
}))

vi.mock('@/lib/avec/client', () => ({
  getAvecBaseUrl: () => 'https://api.avec.beauty',
  isAvecConfigured: () => false,
  isAvecMock: () => false,
}))

vi.mock('@/lib/ai/client', () => ({
  isAiConfigured: () => false,
}))

vi.mock('@/lib/brand', () => ({
  getBrand: () => ({ displayName: 'ROM Test', panel: 'vitrini', productName: 'ROM' }),
  getRomPanelId: () => 'vitrini',
}))

vi.mock('@/lib/avec/sync', () => ({
  getLastAvecSync: () => Promise.resolve(null),
}))

vi.mock('@/lib/avec/sync-stock', () => ({
  getLastStockSync: () => Promise.resolve(null),
}))

vi.mock('@/lib/deployment', () => ({
  getDeploymentContext: () => ({
    display_name: 'ROM Test',
    host: null,
    panel: 'vitrini',
    product_name: 'ROM',
    vercel_env: null,
    vercel_url: null,
  }),
  validateDeploymentEnv: () => ({ ok: true, warnings: [] }),
}))

const ENV_KEYS = [
  'ROM_ADMIN_PASSWORD',
  'ROM_ACCESS_TOKEN',
  'ROM_FINANCE_PASSWORD',
  'ROM_STOCK_PASSWORD',
] as const

const snapshot = new Map<string, string | undefined>()

function setEnv(vars: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>>) {
  for (const key of ENV_KEYS) {
    if (!snapshot.has(key)) snapshot.set(key, process.env[key])
    const value = vars[key]
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
}

afterEach(() => {
  for (const key of ENV_KEYS) {
    const prev = snapshot.get(key)
    if (prev === undefined) delete process.env[key]
    else process.env[key] = prev
  }
  snapshot.clear()
  sqlMock.mockClear()
})

describe('getHealthStatus auth readiness', () => {
  it('does not mark auth passwords configured from legacy/default fallbacks', async () => {
    setEnv({
      ROM_ADMIN_PASSWORD: undefined,
      ROM_ACCESS_TOKEN: 'legacy-token',
      ROM_FINANCE_PASSWORD: undefined,
      ROM_STOCK_PASSWORD: undefined,
    })

    const health = await getHealthStatus()

    expect(health.auth.enabled).toBe(false)
    expect(health.auth.password).toBe(false)
    expect(health.auth.finance_configured).toBe(false)
    expect(health.auth.stock_configured).toBe(false)
  })

  it('marks auth passwords configured only from explicit role env vars', async () => {
    setEnv({
      ROM_ADMIN_PASSWORD: 'admin-secret',
      ROM_ACCESS_TOKEN: undefined,
      ROM_FINANCE_PASSWORD: 'finance-secret',
      ROM_STOCK_PASSWORD: 'stock-secret',
    })

    const health = await getHealthStatus()

    expect(health.auth.enabled).toBe(true)
    expect(health.auth.password).toBe(true)
    expect(health.auth.finance_configured).toBe(true)
    expect(health.auth.stock_configured).toBe(true)
  })
})
