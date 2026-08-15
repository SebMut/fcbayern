-- ============================================================
-- FC Bayern: History + Sync-Status reparieren/nachrüsten
-- Kann mehrfach ausgeführt werden.
-- Bestehende Karten-/Spieldaten werden NICHT gelöscht.
-- ============================================================

-- 1) History-Tabelle
create table if not exists public.history_log (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  actor_user_id uuid,
  actor_name text not null,
  entity_type text not null,
  entity_id text,
  before_data jsonb,
  after_data jsonb
);

-- Alte Constraint-Version erweitern.
alter table public.history_log
  drop constraint if exists history_log_entity_type_check;

alter table public.history_log
  add constraint history_log_entity_type_check
  check (entity_type in ('season_state','fixture','sync_run'));

create index if not exists history_log_created_idx
  on public.history_log(created_at desc);

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
    select 1
    from public.allowed_emails ae
    where lower(ae.email) = lower(auth.jwt()->>'email')
  )
);

-- 2) season_state muss den ausgewählten Benutzer kennen.
alter table public.season_state
  add column if not exists updated_by text not null default 'Admin';

-- 3) Trigger für Karten/Gäste/Bezahlt/Notizen
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.log_season_state_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.data is not distinct from old.data then
    return new;
  end if;

  insert into public.history_log(
    actor_user_id,
    actor_name,
    entity_type,
    entity_id,
    before_data,
    after_data
  )
  values(
    auth.uid(),
    case
      when new.updated_by in ('Admin','Patrick','Ober') then new.updated_by
      else 'Admin'
    end,
    'season_state',
    new.season,
    old.data,
    new.data
  );

  return new;
end;
$$;

revoke all on function private.log_season_state_history() from public, anon, authenticated;

drop trigger if exists season_state_history_trigger on public.season_state;
create trigger season_state_history_trigger
after update on public.season_state
for each row
execute function private.log_season_state_history();

-- 4) Trigger für Änderungen an offiziellen Spielterminen/Gegnern.
create or replace function private.log_fixture_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_payload jsonb;
  new_payload jsonb;
begin
  if tg_op = 'INSERT' then
    old_payload := '{}'::jsonb;
  else
    old_payload := jsonb_build_object(
      'start_date', old.start_date,
      'end_date', old.end_date,
      'kickoff_time', old.kickoff_time,
      'opponent', old.opponent,
      'home', old.home,
      'possible', old.possible,
      'active', old.active
    );

    if (
      new.start_date,new.end_date,new.kickoff_time,new.opponent,
      new.home,new.possible,new.active
    ) is not distinct from (
      old.start_date,old.end_date,old.kickoff_time,old.opponent,
      old.home,old.possible,old.active
    ) then
      return new;
    end if;
  end if;

  new_payload := jsonb_build_object(
    'start_date', new.start_date,
    'end_date', new.end_date,
    'kickoff_time', new.kickoff_time,
    'opponent', new.opponent,
    'home', new.home,
    'possible', new.possible,
    'active', new.active
  );

  insert into public.history_log(
    actor_user_id,actor_name,entity_type,entity_id,before_data,after_data
  )
  values(
    auth.uid(),
    'System',
    'fixture',
    new.id,
    old_payload,
    new_payload
  );

  return new;
end;
$$;

revoke all on function private.log_fixture_history() from public, anon, authenticated;

drop trigger if exists match_override_history_trigger on public.match_overrides;
create trigger match_override_history_trigger
after insert or update on public.match_overrides
for each row
execute function private.log_fixture_history();

-- 5) Sync-Läufe müssen für den Header lesbar sein.
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

alter table public.fixture_sync_runs enable row level security;
grant select on public.fixture_sync_runs to authenticated;

drop policy if exists "allowed members can read fixture sync status"
on public.fixture_sync_runs;

create policy "allowed members can read fixture sync status"
on public.fixture_sync_runs
for select
to authenticated
using (
  exists (
    select 1
    from public.allowed_emails ae
    where lower(ae.email) = lower(auth.jwt()->>'email')
  )
);

-- Kontrolle:
select
  (select count(*) from public.history_log) as history_entries,
  (select count(*) from public.fixture_sync_runs) as sync_runs;
