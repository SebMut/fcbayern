-- FC Bayern Jahreskarten 2026/27 - Supabase Setup
-- Projekt: FCBayern_Ober
-- Danach unter Authentication > Providers > Email:
-- "Allow new users to sign up" DEAKTIVIEREN.
-- Benutzer ausschließlich manuell unter Authentication > Users anlegen.

create table if not exists public.allowed_emails (
  email text primary key
);

alter table public.allowed_emails enable row level security;
revoke all on public.allowed_emails from anon;
revoke insert, update, delete on public.allowed_emails from authenticated;
grant select on public.allowed_emails to authenticated;

drop policy if exists "member can see own allowlist entry" on public.allowed_emails;
create policy "member can see own allowlist entry"
on public.allowed_emails
for select
to authenticated
using (lower(email) = lower(auth.jwt()->>'email'));

create table if not exists public.season_state (
  season text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.season_state enable row level security;
revoke all on public.season_state from anon;
grant select, update on public.season_state to authenticated;

drop policy if exists "allowed members can read season" on public.season_state;
create policy "allowed members can read season"
on public.season_state
for select
to authenticated
using (
  season = '2026-27'
  and exists (
    select 1 from public.allowed_emails ae
    where lower(ae.email) = lower(auth.jwt()->>'email')
  )
);

drop policy if exists "allowed members can update season" on public.season_state;
create policy "allowed members can update season"
on public.season_state
for update
to authenticated
using (
  season = '2026-27'
  and exists (
    select 1 from public.allowed_emails ae
    where lower(ae.email) = lower(auth.jwt()->>'email')
  )
)
with check (
  season = '2026-27'
  and exists (
    select 1 from public.allowed_emails ae
    where lower(ae.email) = lower(auth.jwt()->>'email')
  )
);

insert into public.season_state(season,data)
values (
  '2026-27',
  '{"p1":"Patrick","p2":"Reini","assignments":{},"guests":{},"paid":{},"notes":{}}'::jsonb
)
on conflict (season) do nothing;

create table if not exists public.match_overrides (
  id text primary key,
  season text not null default '2026-27',
  start_date date,
  end_date date,
  kickoff_time time,
  opponent text,
  home boolean,
  possible boolean,
  active boolean not null default true,
  source text,
  source_updated_at timestamptz,
  updated_at timestamptz not null default now()
);
create index if not exists match_overrides_season_idx on public.match_overrides(season);
alter table public.match_overrides enable row level security;
revoke all on public.match_overrides from anon;
revoke insert, update, delete on public.match_overrides from authenticated;
grant select on public.match_overrides to authenticated;

drop policy if exists "allowed members can read match overrides" on public.match_overrides;
create policy "allowed members can read match overrides"
on public.match_overrides
for select
to authenticated
using (
  season = '2026-27'
  and exists (
    select 1 from public.allowed_emails ae
    where lower(ae.email) = lower(auth.jwt()->>'email')
  )
);

create table if not exists public.fixture_sync_runs (
  id bigint generated always as identity primary key,
  local_date date not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null check (status in ('running','success','failed','skipped')),
  found_count integer not null default 0,
  updated_count integer not null default 0,
  message text
);
create index if not exists fixture_sync_runs_date_idx on public.fixture_sync_runs(local_date,status);
alter table public.fixture_sync_runs enable row level security;
revoke all on public.fixture_sync_runs from anon, authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='season_state'
  ) then
    alter publication supabase_realtime add table public.season_state;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='match_overrides'
  ) then
    alter publication supabase_realtime add table public.match_overrides;
  end if;
end $$;

-- Erlaubte technische E-Mails direkt im Supabase SQL Editor ergänzen:
-- insert into public.allowed_emails(email) values
--   (lower('admin@fcbayern-ober.example')),
--   (lower('patrick@fcbayern-ober.example')),
--   (lower('ober@fcbayern-ober.example'))
-- on conflict do nothing;

create table if not exists public.profiles (
  email text primary key,
  display_name text not null unique
);
alter table public.profiles enable row level security;
revoke all on public.profiles from anon, authenticated;

create table if not exists public.history_log (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  actor_user_id uuid,
  actor_name text not null,
  entity_type text not null check (entity_type in ('season_state','fixture')),
  entity_id text,
  before_data jsonb,
  after_data jsonb
);
create index if not exists history_log_created_idx on public.history_log(created_at desc);
alter table public.history_log enable row level security;
revoke all on public.history_log from anon;
revoke insert, update, delete on public.history_log from authenticated;
grant select on public.history_log to authenticated;

drop policy if exists "allowed members can read history" on public.history_log;
create policy "allowed members can read history"
on public.history_log
for select
to authenticated
using (
  exists (
    select 1 from public.allowed_emails ae
    where lower(ae.email) = lower(auth.jwt()->>'email')
  )
);

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.history_actor_name()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select p.display_name
      from public.profiles p
      where lower(p.email) = lower(coalesce(auth.jwt()->>'email',''))
      limit 1
    ),
    case when auth.uid() is null then 'System' else 'Benutzer' end
  );
$$;
revoke all on function private.history_actor_name() from public, anon, authenticated;

create or replace function private.log_season_state_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.data is not distinct from old.data then return new; end if;
  insert into public.history_log(actor_user_id,actor_name,entity_type,entity_id,before_data,after_data)
  values(auth.uid(),private.history_actor_name(),'season_state',new.season,old.data,new.data);
  return new;
end;
$$;
revoke all on function private.log_season_state_history() from public, anon, authenticated;
drop trigger if exists season_state_history_trigger on public.season_state;
create trigger season_state_history_trigger after update on public.season_state
for each row execute function private.log_season_state_history();

create or replace function private.log_fixture_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare old_payload jsonb; new_payload jsonb;
begin
  if tg_op = 'INSERT' then
    old_payload := '{}'::jsonb;
  else
    old_payload := jsonb_build_object('start_date',old.start_date,'end_date',old.end_date,'kickoff_time',old.kickoff_time,'opponent',old.opponent,'home',old.home,'possible',old.possible,'active',old.active);
    if (new.start_date,new.end_date,new.kickoff_time,new.opponent,new.home,new.possible,new.active)
       is not distinct from
       (old.start_date,old.end_date,old.kickoff_time,old.opponent,old.home,old.possible,old.active)
    then return new; end if;
  end if;
  new_payload := jsonb_build_object('start_date',new.start_date,'end_date',new.end_date,'kickoff_time',new.kickoff_time,'opponent',new.opponent,'home',new.home,'possible',new.possible,'active',new.active);
  insert into public.history_log(actor_user_id,actor_name,entity_type,entity_id,before_data,after_data)
  values(auth.uid(),private.history_actor_name(),'fixture',new.id,old_payload,new_payload);
  return new;
end;
$$;
revoke all on function private.log_fixture_history() from public, anon, authenticated;
drop trigger if exists match_override_history_trigger on public.match_overrides;
create trigger match_override_history_trigger after insert or update on public.match_overrides
for each row execute function private.log_fixture_history();

-- Profile-Zuordnung direkt im Supabase SQL Editor ergänzen:
-- insert into public.profiles(email,display_name) values
--   (lower('admin@fcbayern-ober.example'),'Admin'),
--   (lower('patrick@fcbayern-ober.example'),'Patrick'),
--   (lower('ober@fcbayern-ober.example'),'Ober')
-- on conflict (email) do update set display_name=excluded.display_name;
