import { afterEach, describe, expect, it, vi } from 'vitest'
import { checkProRateLimit, resetProRateLimitsForTests } from './rate-limit'

function request(ip: string) {
  return new Request('https://example.com/api/pro/auth/login', {
    headers: {
      'x-forwarded-for': ip,
    },
  })
}

describe('checkProRateLimit', () => {
  afterEach(() => {
    resetProRateLimitsForTests()
    vi.useRealTimers()
  })

  it('blocks requests after the configured sliding window limit', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))

    const options = { route: 'login', limit: 2, windowMs: 60_000 }

    expect(checkProRateLimit(request('203.0.113.10'), options)).toEqual({ allowed: true })
    expect(checkProRateLimit(request('203.0.113.10'), options)).toEqual({ allowed: true })
    expect(checkProRateLimit(request('203.0.113.10'), options)).toEqual({
      allowed: false,
      retryAfterSeconds: 60,
    })

    vi.advanceTimersByTime(60_000)

    expect(checkProRateLimit(request('203.0.113.10'), options)).toEqual({ allowed: true })
  })

  it('keys limits by route and client IP', () => {
    const options = { route: 'login', limit: 1, windowMs: 60_000 }

    expect(checkProRateLimit(request('203.0.113.10'), options)).toEqual({ allowed: true })
    expect(checkProRateLimit(request('203.0.113.11'), options)).toEqual({ allowed: true })
    expect(
      checkProRateLimit(request('203.0.113.10'), { ...options, route: 'register' }),
    ).toEqual({ allowed: true })
  })
})
