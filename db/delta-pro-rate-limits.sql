-- Rate limit distribuído do Pro (substitui o contador em memória, que não
-- funciona entre instâncias serverless).
create table if not exists pro_rate_limit_hits (
  key text primary key,
  hits jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists pro_rate_limit_hits_updated_at_idx
  on pro_rate_limit_hits (updated_at);
