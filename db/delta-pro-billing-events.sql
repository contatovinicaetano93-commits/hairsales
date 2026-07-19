-- Stripe webhook idempotency ledger for subscriber billing events.

create table if not exists subscriber_billing_events (
  id uuid primary key default gen_random_uuid(),
  stripe_event_id text unique not null,
  type text not null,
  subscriber_id uuid references subscribers (id) on delete set null,
  payload_summary jsonb,
  processed_at timestamptz not null default now(),
  status text not null default 'processed'
    check (status in ('processed', 'ignored', 'error'))
);

create index if not exists subscriber_billing_events_subscriber_idx
  on subscriber_billing_events (subscriber_id, processed_at desc)
  where subscriber_id is not null;

create index if not exists subscriber_billing_events_type_processed_idx
  on subscriber_billing_events (type, processed_at desc);

create index if not exists subscriber_billing_events_status_processed_idx
  on subscriber_billing_events (status, processed_at desc);
