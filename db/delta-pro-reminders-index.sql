-- Melhorar query de busca de lembretes a enviar.
-- A query filtra por reminder_sent_at IS NULL + range de scheduled_at,
-- mas o índice anterior era genérico (subscriber_id, scheduled_at).
-- Adiciona índice parcial que inclui o WHERE, reduzindo scans.

create index if not exists subscriber_appointments_pending_reminders_idx
  on subscriber_appointments (subscriber_id, scheduled_at)
  where reminder_sent_at is null and scheduled_at is not null;
