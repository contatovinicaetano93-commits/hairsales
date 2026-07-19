import { getSql } from '@/lib/db'

export type BillingEventStatus = 'processed' | 'ignored' | 'error'
export type BillingEventPayloadSummary = Record<string, unknown>

interface ClaimBillingEventOptions {
  status?: BillingEventStatus
  payloadSummary?: BillingEventPayloadSummary | null
}

interface MarkBillingEventInput {
  status: BillingEventStatus
  subscriberId?: string | null
  payloadSummary?: BillingEventPayloadSummary | null
}

function payloadSummaryJson(payloadSummary: BillingEventPayloadSummary | null | undefined) {
  return payloadSummary ? JSON.stringify(payloadSummary) : null
}

export async function claimBillingEvent(
  eventId: string,
  type: string,
  subscriberId?: string | null,
  options: ClaimBillingEventOptions = {},
): Promise<{ claimed: boolean }> {
  const sql = getSql()
  const rows = (await sql`
    insert into subscriber_billing_events (
      stripe_event_id, type, subscriber_id, status, payload_summary
    ) values (
      ${eventId},
      ${type},
      ${subscriberId ?? null},
      ${options.status ?? 'processed'},
      ${payloadSummaryJson(options.payloadSummary)}::jsonb
    )
    on conflict (stripe_event_id) do nothing
    returning stripe_event_id
  `) as { stripe_event_id: string }[]

  return { claimed: rows.length > 0 }
}

export async function markBillingEvent(
  eventId: string,
  input: MarkBillingEventInput,
): Promise<void> {
  const sql = getSql()
  await sql`
    update subscriber_billing_events
    set status = ${input.status},
        subscriber_id = coalesce(${input.subscriberId ?? null}, subscriber_id),
        payload_summary = coalesce(${payloadSummaryJson(input.payloadSummary)}::jsonb, payload_summary),
        processed_at = now()
    where stripe_event_id = ${eventId}
  `
}

export async function deleteBillingEvent(eventId: string): Promise<void> {
  const sql = getSql()
  await sql`
    delete from subscriber_billing_events
    where stripe_event_id = ${eventId}
  `
}
