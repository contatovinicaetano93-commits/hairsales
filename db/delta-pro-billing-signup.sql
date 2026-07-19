-- Checkout Stripe antes do cadastro (Standard / Pro) — app do profissional.

create table if not exists subscriber_pending_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  plan text not null check (plan in ('free', 'pro')),
  stripe_session_id text not null,
  stripe_customer_id text,
  status text not null default 'awaiting_payment'
    check (status in ('awaiting_payment', 'paid', 'completed', 'expired')),
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  completed_at timestamptz,
  subscriber_id uuid references subscribers (id) on delete set null
);

create unique index if not exists subscriber_pending_signups_session_idx
  on subscriber_pending_signups (stripe_session_id);

create index if not exists subscriber_pending_signups_email_idx
  on subscriber_pending_signups (lower(email));
