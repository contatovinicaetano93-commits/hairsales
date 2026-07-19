import { createHmac } from 'crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createProSessionToken, parseProSessionToken } from './auth'
import { getProDataSecret } from './secrets'

function signedPayload(payload: string, secret: string) {
  return createHmac('sha256', secret).update(payload).digest('base64url')
}

describe('Pro secrets', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllEnvs()
  })

  it('does not fall back to CRON_SECRET for session signing', () => {
    vi.stubEnv('NODE_ENV', 'test')
    vi.stubEnv('PRO_DATA_SECRET', '')
    vi.stubEnv('CRON_SECRET', 'cron-secret')

    const token = createProSessionToken('sub_123', 1)
    const [payload, signature] = token.split('.')

    expect(payload).toBeTruthy()
    expect(signature).toBeTruthy()
    expect(signature).not.toBe(signedPayload(payload!, 'cron-secret'))
  })

  it('throws in production when PRO_DATA_SECRET is missing even if CRON_SECRET exists', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('PRO_DATA_SECRET', '')
    vi.stubEnv('CRON_SECRET', 'cron-secret')

    expect(() => getProDataSecret()).toThrow('PRO_DATA_SECRET')
  })

  it('expires newly issued session tokens after the cookie lifetime', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    vi.stubEnv('NODE_ENV', 'test')
    vi.stubEnv('PRO_DATA_SECRET', 'pro-secret')

    const token = createProSessionToken('sub_123', 1)
    expect(parseProSessionToken(token)).toEqual({ sid: 'sub_123', sv: 1 })

    vi.setSystemTime(new Date('2026-02-01T00:00:01Z'))
    expect(parseProSessionToken(token)).toBeNull()
  })

  it('still accepts older signed session tokens without exp', () => {
    vi.stubEnv('NODE_ENV', 'test')
    vi.stubEnv('PRO_DATA_SECRET', 'pro-secret')

    const payload = Buffer.from(JSON.stringify({ sid: 'sub_123', v: 1 }), 'utf8').toString('base64url')
    const token = `${payload}.${signedPayload(payload, 'pro-secret')}`

    expect(parseProSessionToken(token)).toEqual({ sid: 'sub_123', sv: 1 })
  })
})
