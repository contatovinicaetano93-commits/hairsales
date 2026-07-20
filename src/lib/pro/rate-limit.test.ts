import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const queryMock = vi.fn()

function request(ip: string) {
  return new Request('https://example.com/api/pro/auth/login', {
    headers: {
      'x-forwarded-for': ip,
    },
  })
}

describe('checkProRateLimit (fallback em memória, Postgres indisponível)', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.doMock('@/lib/db', () => ({
      getSql: () => {
        throw new Error('DATABASE_URL não configurada')
      },
    }))
  })

  afterEach(async () => {
    const { resetProRateLimitsForTests } = await import('./rate-limit')
    resetProRateLimitsForTests()
    vi.useRealTimers()
    vi.doUnmock('@/lib/db')
  })

  it('blocks requests after the configured sliding window limit', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))

    const { checkProRateLimit } = await import('./rate-limit')
    const options = { route: 'login', limit: 2, windowMs: 60_000 }

    await expect(checkProRateLimit(request('203.0.113.10'), options)).resolves.toEqual({
      allowed: true,
    })
    await expect(checkProRateLimit(request('203.0.113.10'), options)).resolves.toEqual({
      allowed: true,
    })
    await expect(checkProRateLimit(request('203.0.113.10'), options)).resolves.toEqual({
      allowed: false,
      retryAfterSeconds: 60,
    })

    vi.advanceTimersByTime(60_000)

    await expect(checkProRateLimit(request('203.0.113.10'), options)).resolves.toEqual({
      allowed: true,
    })
  })

  it('keys limits by route and client IP', async () => {
    const { checkProRateLimit } = await import('./rate-limit')
    const options = { route: 'login', limit: 1, windowMs: 60_000 }

    await expect(checkProRateLimit(request('203.0.113.10'), options)).resolves.toEqual({
      allowed: true,
    })
    await expect(checkProRateLimit(request('203.0.113.11'), options)).resolves.toEqual({
      allowed: true,
    })
    await expect(
      checkProRateLimit(request('203.0.113.10'), { ...options, route: 'register' }),
    ).resolves.toEqual({ allowed: true })
  })
})

describe('checkProRateLimit (Postgres disponível)', () => {
  beforeEach(() => {
    vi.resetModules()
    queryMock.mockReset()
    vi.doMock('@/lib/db', () => ({
      getSql: () => ({ query: queryMock }),
    }))
  })

  afterEach(() => {
    vi.doUnmock('@/lib/db')
  })

  it('reads the persisted hit count from Postgres and blocks over the limit', async () => {
    // 3 hits já persistidos (janela ainda válida) => acima do limite de 2.
    queryMock.mockResolvedValue([{ hits: ['1000', '2000', '3000'] }])

    const { checkProRateLimit } = await import('./rate-limit')
    const result = await checkProRateLimit(request('203.0.113.10'), {
      route: 'login',
      limit: 2,
      windowMs: 60_000,
    })

    expect(queryMock).toHaveBeenCalledTimes(1)
    expect(result.allowed).toBe(false)
  })
})
