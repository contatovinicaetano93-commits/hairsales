-- Pro migrations 020-024 (Assistente Vitrini)
-- Cole no Neon SQL Editor se não puder passar DATABASE_URL

-- ===== db/delta-pro-subscribers.sql =====
-- App do profissional (assinante B2C) — isolado do painel ROM da unidade.
-- Cada assinante vê apenas os próprios dados sincronizados via Avec/Trinks.

create table if not exists subscribers (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  email text not null,
  password_hash text not null,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  daily_goal_revenue numeric(12, 2),
  weekly_goal_revenue numeric(12, 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists subscribers_email_idx
  on subscribers (lower(email));

create table if not exists subscriber_connections (
  id uuid primary key default gen_random_uuid(),
  subscriber_id uuid not null references subscribers (id) on delete cascade,
  provider text not null check (provider in ('avec', 'trinks')),
  api_token_encrypted text,
  unit_external_id text,
  professional_external_id text,
  professional_name_matched text,
  name_aliases text[] not null default '{}',
  status text not null default 'pending'
    check (status in ('pending', 'active', 'error', 'disconnected')),
  last_sync_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (subscriber_id, provider)
);

create index if not exists subscriber_connections_subscriber_idx
  on subscriber_connections (subscriber_id);

create table if not exists subscriber_metrics_daily (
  subscriber_id uuid not null references subscribers (id) on delete cascade,
  day date not null,
  revenue numeric(12, 2) not null default 0,
  attended int not null default 0,
  ticket_avg numeric(12, 2),
  occupancy numeric(8, 4),
  appointments int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (subscriber_id, day)
);

create table if not exists subscriber_clients (
  id uuid primary key default gen_random_uuid(),
  subscriber_id uuid not null references subscribers (id) on delete cascade,
  external_client_id text,
  name text,
  phone text,
  email text,
  status text not null default 'novo'
    check (status in ('novo', 'em_atendimento', 'agendado', 'convertido', 'perdido')),
  last_visit_at timestamptz,
  last_service_name text,
  last_price numeric(12, 2),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists subscriber_clients_external_idx
  on subscriber_clients (subscriber_id, external_client_id)
  where external_client_id is not null;

create index if not exists subscriber_clients_subscriber_idx
  on subscriber_clients (subscriber_id, updated_at desc);

create index if not exists subscriber_clients_last_visit_idx
  on subscriber_clients (subscriber_id, last_visit_at desc nulls last);

create table if not exists subscriber_appointments (
  id uuid primary key default gen_random_uuid(),
  subscriber_id uuid not null references subscribers (id) on delete cascade,
  client_id uuid references subscriber_clients (id) on delete set null,
  external_client_id text,
  client_name text,
  service_name text,
  scheduled_at timestamptz,
  status text,
  price numeric(12, 2),
  source text not null default 'avec',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subscriber_appointments_day_idx
  on subscriber_appointments (subscriber_id, scheduled_at);

create table if not exists subscriber_services (
  id uuid primary key default gen_random_uuid(),
  subscriber_id uuid not null references subscribers (id) on delete cascade,
  client_id uuid not null references subscriber_clients (id) on delete cascade,
  name text not null,
  category text not null default 'outro',
  cadence_days int,
  last_done_at timestamptz,
  scheduled_at timestamptz,
  last_price numeric(12, 2),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists subscriber_services_client_idx
  on subscriber_services (client_id)
  where active = true;

-- ===== db/delta-pro-assistant.sql =====
-- Fase 2: cotas de IA, Telegram do assinante, histórico leve do assistente.

alter table subscribers
  add column if not exists telegram_chat_id text;

create unique index if not exists subscribers_telegram_chat_idx
  on subscribers (telegram_chat_id)
  where telegram_chat_id is not null;

create table if not exists subscriber_ai_usage (
  subscriber_id uuid not null references subscribers (id) on delete cascade,
  day date not null,
  units_used int not null default 0,
  briefing_done boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (subscriber_id, day)
);

create table if not exists subscriber_telegram_link_codes (
  code text primary key,
  subscriber_id uuid not null references subscribers (id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists subscriber_telegram_link_codes_sub_idx
  on subscriber_telegram_link_codes (subscriber_id);

create table if not exists subscriber_assistant_messages (
  id uuid primary key default gen_random_uuid(),
  subscriber_id uuid not null references subscribers (id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  units int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists subscriber_assistant_messages_sub_idx
  on subscriber_assistant_messages (subscriber_id, created_at desc);

-- ===== db/delta-pro-whatsapp.sql =====
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

-- ===== db/delta-pro-wa-packs.sql =====
-- Packs de marketing + controle de lembrete automático.

alter table subscribers
  add column if not exists marketing_credits int not null default 0;

alter table subscriber_whatsapp
  add column if not exists marketing_credits int not null default 0;

alter table subscriber_appointments
  add column if not exists reminder_sent_at timestamptz;

create table if not exists subscriber_whatsapp_pack_purchases (
  id uuid primary key default gen_random_uuid(),
  subscriber_id uuid not null references subscribers (id) on delete cascade,
  pack_id text not null,
  credits int not null,
  amount_cents int,
  status text not null default 'completed'
    check (status in ('completed', 'pending', 'failed')),
  created_at timestamptz not null default now()
);

create index if not exists subscriber_whatsapp_pack_purchases_sub_idx
  on subscriber_whatsapp_pack_purchases (subscriber_id, created_at desc);

-- ===== db/delta-pro-stripe.sql =====
-- Stripe: sessões de checkout dos packs marketing (+ opcional assinatura Pro).

alter table subscriber_whatsapp_pack_purchases
  add column if not exists stripe_session_id text;

alter table subscriber_whatsapp_pack_purchases
  add column if not exists stripe_payment_intent text;

alter table subscriber_whatsapp_pack_purchases
  add column if not exists provider text not null default 'demo';

create unique index if not exists subscriber_whatsapp_pack_purchases_stripe_session_idx
  on subscriber_whatsapp_pack_purchases (stripe_session_id)
  where stripe_session_id is not null;

alter table subscribers
  add column if not exists stripe_customer_id text;

create unique index if not exists subscribers_stripe_customer_idx
  on subscribers (stripe_customer_id)
  where stripe_customer_id is not null;

-- registrar no schema_migrations (evita reaplicar no boot)
create table if not exists schema_migrations (
  id text primary key,
  applied_at timestamptz not null default now()
);
insert into schema_migrations (id) values
  ('020_pro_subscribers'),
  ('021_pro_assistant'),
  ('022_pro_whatsapp'),
  ('023_pro_wa_packs'),
  ('024_pro_stripe')
on conflict (id) do nothing;
