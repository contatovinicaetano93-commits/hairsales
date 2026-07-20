-- subscriber_services era filtrada por subscriber_id (hoje/ações, toda vez
-- que o dashboard carrega) sem índice líder nessa coluna — só existia um
-- índice parcial por client_id.
create index if not exists subscriber_services_subscriber_active_idx
  on subscriber_services (subscriber_id, last_done_at)
  where active = true;
