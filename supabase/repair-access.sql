-- FC Bayern Supabase - Zugriff reparieren / prüfen
-- Im Supabase-Projekt FCBayern_Ober im SQL Editor komplett ausführen.

create table if not exists public.allowed_emails (
  email text primary key
);
alter table public.allowed_emails enable row level security;
grant select on public.allowed_emails to authenticated;
drop policy if exists "member can see own allowlist entry" on public.allowed_emails;
create policy "member can see own allowlist entry"
on public.allowed_emails
for select
to authenticated
using (lower(email) = lower(auth.jwt()->>'email'));
insert into public.allowed_emails(email)
values (lower('Sebastian.Mutter@outlook.com'))
on conflict do nothing;

create table if not exists public.season_state (
  season text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_by text not null default 'Admin',
  updated_at timestamptz not null default now()
);
alter table public.season_state add column if not exists updated_by text not null default 'Admin';
alter table public.season_state enable row level security;
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
  and updated_by in ('Admin','Patrick','Ober')
  and exists (
    select 1 from public.allowed_emails ae
    where lower(ae.email) = lower(auth.jwt()->>'email')
  )
);
insert into public.season_state(season,data,updated_by)
values (
  '2026-27',
  '{"p1":"Patrick","p2":"Reini","assignments":{},"guests":{},"paid":{},"notes":{}}'::jsonb,
  'Admin'
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
alter table public.match_overrides enable row level security;
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

select 'allowed_emails' as check_name, count(*)::text as result
from public.allowed_emails
where lower(email)=lower('Sebastian.Mutter@outlook.com')
union all
select 'season_state', count(*)::text
from public.season_state
where season='2026-27'
union all
select 'match_overrides table', count(*)::text
from public.match_overrides;
