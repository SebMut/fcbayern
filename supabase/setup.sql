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

-- Nur offizielle Änderungen gegenüber der Grundliste in index.html.
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

create index if not exists match_overrides_season_idx
  on public.match_overrides(season);

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

-- Nur für Edge Function / Service-Role, nicht für Browser.
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

create index if not exists fixture_sync_runs_date_idx
  on public.fixture_sync_runs(local_date,status);

alter table public.fixture_sync_runs enable row level security;
revoke all on public.fixture_sync_runs from anon, authenticated;

-- Realtime für Kartenverteilung und Terminänderungen.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime'
      and schemaname='public'
      and tablename='season_state'
  ) then
    alter publication supabase_realtime add table public.season_state;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime'
      and schemaname='public'
      and tablename='match_overrides'
  ) then
    alter publication supabase_realtime add table public.match_overrides;
  end if;
end $$;

-- Erlaubte E-Mails nur direkt im Supabase SQL Editor eintragen:
-- insert into public.allowed_emails(email) values
--   (lower('EMAIL_1')),
--   (lower('EMAIL_2')),
--   (lower('EMAIL_3'))
-- on conflict do nothing;
