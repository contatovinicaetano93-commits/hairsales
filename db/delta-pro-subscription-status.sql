-- HairSales billing model: real Standard/Pro plan plus subscription status.

do $$
declare
  constraint_name text;
begin
  if to_regclass('subscribers') is null then
    return;
  end if;

  for constraint_name in
    select c.conname
    from pg_constraint c
    where c.conrelid = 'subscribers'::regclass
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%plan%'
  loop
    execute format('alter table subscribers drop constraint %I', constraint_name);
  end loop;
end $$;

alter table subscribers
  alter column plan set default 'standard';

update subscribers
set plan = 'standard'
where plan = 'free'
   or plan is null
   or plan not in ('standard', 'pro');

alter table subscribers
  add constraint subscribers_plan_check
  check (plan in ('standard', 'pro'));

alter table subscribers
  add column if not exists subscription_status text default 'none';

update subscribers
set subscription_status = 'none'
where subscription_status is null
   or subscription_status not in ('none', 'active', 'canceled', 'past_due');

update subscribers
set subscription_status = 'active'
where stripe_customer_id is not null
  and subscription_status = 'none';

alter table subscribers
  alter column subscription_status set default 'none',
  alter column subscription_status set not null;

do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select c.conname
    from pg_constraint c
    where c.conrelid = 'subscribers'::regclass
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%subscription_status%'
  loop
    execute format('alter table subscribers drop constraint %I', constraint_name);
  end loop;
end $$;

alter table subscribers
  add constraint subscribers_subscription_status_check
  check (subscription_status in ('none', 'active', 'canceled', 'past_due'));

do $$
declare
  constraint_name text;
begin
  if to_regclass('subscriber_pending_signups') is null then
    return;
  end if;

  for constraint_name in
    select c.conname
    from pg_constraint c
    where c.conrelid = 'subscriber_pending_signups'::regclass
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%plan%'
  loop
    execute format('alter table subscriber_pending_signups drop constraint %I', constraint_name);
  end loop;
end $$;

do $$
begin
  if to_regclass('subscriber_pending_signups') is null then
    return;
  end if;

  update subscriber_pending_signups
  set plan = 'standard'
  where plan = 'free'
     or plan is null
     or plan not in ('standard', 'pro');

  alter table subscriber_pending_signups
    add constraint subscriber_pending_signups_plan_check
    check (plan in ('standard', 'pro'));
end $$;
