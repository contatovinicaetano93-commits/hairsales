import { getSql } from '@/lib/db'

export type BillingEventStatus = 'pending' | 'processed' | 'ignored' | 'error'
export type BillingEventPayloadSummary = Record<string, unknown>
export type ClaimBillingEventResult =
  | { claimed: true }
  | { claimed: false; reason: 'duplicate' | 'pending' }

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
): Promise<ClaimBillingEventResult> {
  const sql = getSql()
  const status = options.status ?? 'pending'
  const rows = (await sql`
    with claimed_event as (
      insert into subscriber_billing_events (
        stripe_event_id, type, subscriber_id, status, payload_summary
      ) values (
        ${eventId},
        ${type},
        ${subscriberId ?? null},
        ${status},
        ${payloadSummaryJson(options.payloadSummary)}::jsonb
      )
      on conflict (stripe_event_id) do update
      set type = excluded.type,
          subscriber_id = coalesce(excluded.subscriber_id, subscriber_billing_events.subscriber_id),
          status = excluded.status,
          payload_summary = coalesce(excluded.payload_summary, subscriber_billing_events.payload_summary),
          processed_at = now()
      where subscriber_billing_events.status = 'error'
         or (
           subscriber_billing_events.status = 'pending'
           and subscriber_billing_events.processed_at < now() - interval '5 minutes'
         )
      returning true as claimed, null::text as reason
    ),
    existing_event as (
      select status
      from subscriber_billing_events
      where stripe_event_id = ${eventId}
        and not exists (select 1 from claimed_event)
    )
    select claimed, reason
    from claimed_event
    union all
    select false as claimed,
           case
             when status in ('processed', 'ignored') then 'duplicate'
             when status = 'pending' then 'pending'
             when status = 'error' then 'pending'
             else 'duplicate'
           end as reason
    from existing_event
    limit 1
  `) as { claimed: boolean; reason: 'duplicate' | 'pending' | null }[]

  const row = rows[0]
  if (row?.claimed) return { claimed: true }
  return { claimed: false, reason: row?.reason ?? 'pending' }
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
