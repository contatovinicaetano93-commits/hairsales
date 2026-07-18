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
