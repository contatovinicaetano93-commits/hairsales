import { beforeEach, describe, expect, it, vi } from 'vitest'

const sqlMock = vi.fn()

vi.mock('@/lib/db', () => ({
  getSql: () => sqlMock,
}))

describe('webhook events', () => {
  beforeEach(() => {
    sqlMock.mockReset()
    vi.resetModules()
  })

  it('claims a new webhook event as pending', async () => {
    sqlMock.mockResolvedValueOnce([{ claimed: true, reason: null }])

    const { claimWebhookEvent } = await import('./webhook-events')
    const result = await claimWebhookEvent('telegram', 'update_1', {
      payloadSummary: { chat_id: 42 },
    })

    expect(result).toEqual({ claimed: true })
    expect(sqlMock).toHaveBeenCalledTimes(1)
    expect(sqlMock.mock.calls[0]).toContain('pending')
  })

  it('returns claimed false for duplicate events', async () => {
    sqlMock.mockResolvedValueOnce([{ claimed: false, reason: 'duplicate' }])

    const { claimWebhookEvent } = await import('./webhook-events')
    const result = await claimWebhookEvent('whatsapp', 'wamid.abc')

    expect(result).toEqual({ claimed: false, reason: 'duplicate' })
  })

  it('allows error and stale pending events to be reclaimed', async () => {
    sqlMock.mockResolvedValueOnce([{ claimed: true, reason: null }])

    const { claimWebhookEvent } = await import('./webhook-events')
    const result = await claimWebhookEvent('telegram', 'update_1')
    const sqlText = sqlMock.mock.calls[0][0].join('')

    expect(result).toEqual({ claimed: true })
    expect(sqlText).toContain("pro_webhook_events.status = 'error'")
    expect(sqlText).toContain("pro_webhook_events.status = 'pending'")
    expect(sqlText).toContain("interval '5 minutes'")
  })

  it('scopes duplicates by source, not just event id', async () => {
    sqlMock.mockResolvedValueOnce([{ claimed: true, reason: null }])

    const { claimWebhookEvent } = await import('./webhook-events')
    await claimWebhookEvent('whatsapp', 'shared-id')
    const sqlText = sqlMock.mock.calls[0][0].join('')

    expect(sqlText).toContain('source = ')
    expect(sqlText).toContain('event_id = ')
  })

  it('marks webhook event rows', async () => {
    sqlMock.mockResolvedValueOnce(undefined)

    const { markWebhookEvent } = await import('./webhook-events')
    await markWebhookEvent('whatsapp', 'wamid.abc', {
      status: 'processed',
      payloadSummary: { phone_number_id: '123' },
    })

    expect(sqlMock).toHaveBeenCalledTimes(1)
  })
})
