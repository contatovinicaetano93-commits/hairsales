-- Vínculos Telegram da equipe Vitrini. A tabela começa vazia para evitar
-- herdar chat IDs ou profissionais de outra unidade.
create table if not exists telegram_staff_links (
  chat_id text primary key,
  professional_name text not null,
  created_at timestamptz not null default now()
);
