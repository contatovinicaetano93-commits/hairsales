-- Idempotency ledger for the Telegram Pro and WhatsApp Pro webhooks.
-- Both providers retry webhook delivery on slow responses; this table lets
-- the handlers claim an event id before doing any side effect, so a retry
-- of the same update/message never double-replies or double-inserts rows.

create table if not exists pro_webhook_events (
  id uuid primary key default gen_random_uuid(),
  source text not null
    check (source in ('telegram', 'whatsapp')),
  event_id text not null,
  payload_summary jsonb,
  processed_at timestamptz not null default now(),
  status text not null default 'pending'
    check (status in ('pending', 'processed', 'ignored', 'error')),
  unique (source, event_id)
);

create index if not exists pro_webhook_events_status_processed_idx
  on pro_webhook_events (status, processed_at desc);
