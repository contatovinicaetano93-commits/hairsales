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
