-- Allow Stripe billing event claims to be recorded before handler side effects.

do $$
declare
  constraint_name text;
begin
  if to_regclass('subscriber_billing_events') is null then
    return;
  end if;

  for constraint_name in
    select c.conname
    from pg_constraint c
    where c.conrelid = 'subscriber_billing_events'::regclass
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%status%'
  loop
    execute format('alter table subscriber_billing_events drop constraint %I', constraint_name);
  end loop;

  update subscriber_billing_events
  set status = 'error'
  where status not in ('pending', 'processed', 'ignored', 'error');

  alter table subscriber_billing_events
    alter column status set default 'pending';

  alter table subscriber_billing_events
    add constraint subscriber_billing_events_status_check
    check (status in ('pending', 'processed', 'ignored', 'error'));
end $$;
