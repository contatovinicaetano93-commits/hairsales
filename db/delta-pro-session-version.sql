-- Session invalidation for HairSales Pro auth cookies.

alter table subscribers
  add column if not exists session_version int not null default 1;

update subscribers
set session_version = 1
where session_version is null;

alter table subscribers
  alter column session_version set default 1,
  alter column session_version set not null;
