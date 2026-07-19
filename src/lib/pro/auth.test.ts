import { NextRequest } from 'next/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  PRO_AUTH_COOKIE,
  createProSessionToken,
  getProSession,
  parseProSessionToken,
} from './auth'
import { findSubscriberById, type SubscriberRow } from '@/lib/pro/subscribers'

vi.mock('@/lib/pro/subscribers', () => ({
  findSubscriberById: vi.fn(),
}))

const mockedFindSubscriberById = vi.mocked(findSubscriberById)

function subscriber(sessionVersion: number): SubscriberRow {
  return {
    id: 'sub_123',
    display_name: 'Dani',
    email: 'dani@example.com',
    password_hash: 'hash',
    plan: 'standard',
    subscription_status: 'active',
    daily_goal_revenue: null,
    weekly_goal_revenue: null,
    session_version: sessionVersion,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  }
}

function requestWithToken(token: string) {
  return new NextRequest('https://example.com/api/me/session', {
    headers: {
      cookie: `${PRO_AUTH_COOKIE}=${token}`,
    },
  })
}

describe('Pro auth session version', () => {
  afterEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
  })

  it('embeds the subscriber session version in new tokens', () => {
    vi.stubEnv('NODE_ENV', 'test')
    vi.stubEnv('PRO_DATA_SECRET', 'pro-secret')

    const token = createProSessionToken('sub_123', 7)

    expect(parseProSessionToken(token)).toEqual({ sid: 'sub_123', sv: 7 })
  })

  it('rejects sessions when the token session version is stale', async () => {
    vi.stubEnv('NODE_ENV', 'test')
    vi.stubEnv('PRO_DATA_SECRET', 'pro-secret')
    mockedFindSubscriberById.mockResolvedValue(subscriber(2))

    const token = createProSessionToken('sub_123', 1)

    await expect(getProSession(requestWithToken(token))).resolves.toBeNull()
    expect(mockedFindSubscriberById).toHaveBeenCalledWith('sub_123')
  })
})
