import { getSql } from '@/lib/db'

/**
 * Idempotency ledger shared by the Telegram Pro and WhatsApp Pro webhooks.
 * Mirrors the claim/mark pattern used for Stripe events in `billing-events.ts`:
 * claim the event id before any side effect, mark it done once handled, and
 * allow stale `pending` or `error` rows to be reclaimed so a truly stuck
 * event doesn't wedge retries forever.
 */

export type WebhookEventSource = 'telegram' | 'whatsapp'
export type WebhookEventStatus = 'pending' | 'processed' | 'ignored' | 'error'
export type WebhookEventPayloadSummary = Record<string, unknown>
export type ClaimWebhookEventResult =
  | { claimed: true }
  | { claimed: false; reason: 'duplicate' | 'pending' }

interface ClaimWebhookEventOptions {
  status?: WebhookEventStatus
  payloadSummary?: WebhookEventPayloadSummary | null
}

interface MarkWebhookEventInput {
  status: WebhookEventStatus
  payloadSummary?: WebhookEventPayloadSummary | null
}

function payloadSummaryJson(payloadSummary: WebhookEventPayloadSummary | null | undefined) {
  return payloadSummary ? JSON.stringify(payloadSummary) : null
}

export async function claimWebhookEvent(
  source: WebhookEventSource,
  eventId: string,
  options: ClaimWebhookEventOptions = {},
): Promise<ClaimWebhookEventResult> {
  const sql = getSql()
  const status = options.status ?? 'pending'
  const rows = (await sql`
    with claimed_event as (
      insert into pro_webhook_events (
        source, event_id, status, payload_summary
      ) values (
        ${source},
        ${eventId},
        ${status},
        ${payloadSummaryJson(options.payloadSummary)}::jsonb
      )
      on conflict (source, event_id) do update
      set status = excluded.status,
          payload_summary = coalesce(excluded.payload_summary, pro_webhook_events.payload_summary),
          processed_at = now()
      where pro_webhook_events.status = 'error'
         or (
           pro_webhook_events.status = 'pending'
           and pro_webhook_events.processed_at < now() - interval '5 minutes'
         )
      returning true as claimed, null::text as reason
    ),
    existing_event as (
      select status
      from pro_webhook_events
      where source = ${source}
        and event_id = ${eventId}
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

export async function markWebhookEvent(
  source: WebhookEventSource,
  eventId: string,
  input: MarkWebhookEventInput,
): Promise<void> {
  const sql = getSql()
  await sql`
    update pro_webhook_events
    set status = ${input.status},
        payload_summary = coalesce(${payloadSummaryJson(input.payloadSummary)}::jsonb, payload_summary),
        processed_at = now()
    where source = ${source}
      and event_id = ${eventId}
  `
}
