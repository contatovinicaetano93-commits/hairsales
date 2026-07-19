import { beforeEach, describe, expect, it, vi } from 'vitest'

const sqlMock = vi.fn()

vi.mock('@/lib/db', () => ({
  getSql: () => sqlMock,
}))

describe('billing events', () => {
  beforeEach(() => {
    sqlMock.mockReset()
    vi.resetModules()
  })

  it('claims a new Stripe event as pending', async () => {
    sqlMock.mockResolvedValueOnce([{ claimed: true, reason: null }])

    const { claimBillingEvent } = await import('./billing-events')
    const result = await claimBillingEvent('evt_1', 'checkout.session.completed', 'sub-1', {
      payloadSummary: { session_id: 'cs_1' },
    })

    expect(result).toEqual({ claimed: true })
    expect(sqlMock).toHaveBeenCalledTimes(1)
    expect(sqlMock.mock.calls[0]).toContain('pending')
  })

  it('returns claimed false for duplicate Stripe events', async () => {
    sqlMock.mockResolvedValueOnce([{ claimed: false, reason: 'duplicate' }])

    const { claimBillingEvent } = await import('./billing-events')
    const result = await claimBillingEvent('evt_1', 'checkout.session.completed')

    expect(result).toEqual({ claimed: false, reason: 'duplicate' })
  })

  it('allows error and stale pending events to be reclaimed', async () => {
    sqlMock.mockResolvedValueOnce([{ claimed: true, reason: null }])

    const { claimBillingEvent } = await import('./billing-events')
    const result = await claimBillingEvent('evt_1', 'checkout.session.completed')
    const sqlText = sqlMock.mock.calls[0][0].join('')

    expect(result).toEqual({ claimed: true })
    expect(sqlText).toContain("subscriber_billing_events.status = 'error'")
    expect(sqlText).toContain("subscriber_billing_events.status = 'pending'")
    expect(sqlText).toContain("interval '5 minutes'")
  })

  it('marks and deletes billing event rows', async () => {
    sqlMock.mockResolvedValueOnce(undefined).mockResolvedValueOnce(undefined)

    const { markBillingEvent, deleteBillingEvent } = await import('./billing-events')
    await markBillingEvent('evt_1', {
      status: 'ignored',
      payloadSummary: { object: 'checkout.session' },
    })
    await deleteBillingEvent('evt_1')

    expect(sqlMock).toHaveBeenCalledTimes(2)
  })
})
