-- WhatsApp Cloud API por assinante (plano Pro) + créditos mensais.

alter table subscribers
  add column if not exists plan_notes text;

create table if not exists subscriber_whatsapp (
  subscriber_id uuid primary key references subscribers (id) on delete cascade,
  phone_number_id text not null,
  waba_id text,
  display_phone text,
  access_token_encrypted text not null,
  status text not null default 'active'
    check (status in ('pending', 'active', 'error', 'disconnected')),
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists subscriber_whatsapp_phone_number_idx
  on subscriber_whatsapp (phone_number_id);

create table if not exists subscriber_whatsapp_usage (
  subscriber_id uuid not null references subscribers (id) on delete cascade,
  month text not null, -- YYYY-MM
  utility_sent int not null default 0,
  marketing_sent int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (subscriber_id, month)
);

create table if not exists subscriber_whatsapp_sends (
  id uuid primary key default gen_random_uuid(),
  subscriber_id uuid not null references subscribers (id) on delete cascade,
  client_id uuid references subscriber_clients (id) on delete set null,
  to_phone text not null,
  category text not null check (category in ('utility', 'marketing', 'service')),
  template_name text,
  body_preview text,
  status text not null default 'queued'
    check (status in ('queued', 'sent', 'failed')),
  provider_message_id text,
  error text,
  created_at timestamptz not null default now()
);

create index if not exists subscriber_whatsapp_sends_sub_idx
  on subscriber_whatsapp_sends (subscriber_id, created_at desc);
