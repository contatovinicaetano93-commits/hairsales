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
