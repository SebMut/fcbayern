-- ============================================================
-- FC Bayern: Cron Bootstrap
-- Projekt: FCBayern_Ober
-- Dieses Script aktiviert Cron + pg_net und legt das Sync-Log an.
-- Danach fehlt nur noch:
--   1) Edge Function "sync-fixtures" deployen
--   2) Supabase SECRET KEY in Vault speichern
--   3) den Job am Ende aktivieren
-- ============================================================

-- 1) Benötigte Extensions
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 2) Protokolltabelle für unseren FC-Bayern-Sync
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

-- 3) Projekt-URL sicher in Vault hinterlegen
-- Doppelte Anlage vermeiden:
do $$
begin
  if not exists (
    select 1 from vault.decrypted_secrets
    where name = 'fcb_project_url'
  ) then
    perform vault.create_secret(
      'https://kmhadzujovvxvpgblgkk.supabase.co',
      'fcb_project_url'
    );
  end if;
end $$;

-- ============================================================
-- WICHTIG:
-- Jetzt im Supabase Dashboard unter Settings > API Keys
-- einen SECRET Key nehmen/erstellen.
--
-- Diesen SECRET KEY NICHT in GitHub und NICHT hier im Chat posten.
--
-- Dann EINMAL im SQL Editor ausführen:
--
-- select vault.create_secret(
--   'DEIN_SECRET_KEY',
--   'fcb_cron_secret_key'
-- );
-- ============================================================

-- 4) Erst NACHDEM fcb_cron_secret_key existiert:
-- Vorhandenen Job gleichen Namens sicher entfernen.
select cron.unschedule(jobid)
from cron.job
where jobname = 'fcb-nightly-fixture-sync';

-- Der Scheduler arbeitet in UTC.
-- Wir rufen 00:00, 01:00 und 02:00 UTC auf.
-- Die Edge Function entscheidet anhand Europe/Berlin,
-- welcher Lauf der echte Tageslauf ist und führt max. 1 Sync/Tag aus.
select cron.schedule(
  'fcb-nightly-fixture-sync',
  '0 0,1,2 * * *',
  $$
  select net.http_post(
    url := (
      select decrypted_secret
      from vault.decrypted_secrets
      where name = 'fcb_project_url'
      limit 1
    ) || '/functions/v1/sync-fixtures',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'fcb_cron_secret_key'
        limit 1
      )
    ),
    body := jsonb_build_object('scheduled_at', now()),
    timeout_milliseconds := 30000
  ) as request_id;
  $$
);

-- ============================================================
-- KONTROLLE
-- ============================================================

-- Extension aktiv?
select extname, extversion
from pg_extension
where extname in ('pg_cron','pg_net')
order by extname;

-- Job angelegt?
select jobid, jobname, schedule, active
from cron.job
where jobname = 'fcb-nightly-fixture-sync';

-- Läufe des pg_cron:
select jobid, status, return_message, start_time, end_time
from cron.job_run_details
order by start_time desc
limit 20;

-- Läufe unserer Edge Function:
select *
from public.fixture_sync_runs
order by started_at desc
limit 20;
