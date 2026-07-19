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

  it('claims a new Stripe event', async () => {
    sqlMock.mockResolvedValueOnce([{ stripe_event_id: 'evt_1' }])

    const { claimBillingEvent } = await import('./billing-events')
    const result = await claimBillingEvent('evt_1', 'checkout.session.completed', 'sub-1', {
      payloadSummary: { session_id: 'cs_1' },
    })

    expect(result).toEqual({ claimed: true })
    expect(sqlMock).toHaveBeenCalledTimes(1)
  })

  it('returns claimed false for duplicate Stripe events', async () => {
    sqlMock.mockResolvedValueOnce([])

    const { claimBillingEvent } = await import('./billing-events')
    const result = await claimBillingEvent('evt_1', 'checkout.session.completed')

    expect(result).toEqual({ claimed: false })
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
