-- ============================================================
-- FC Bayern: Cron Bootstrap
-- Projekt: FCBayern_Ober
-- Dieses Script aktiviert Cron + pg_net und legt das Sync-Log an.
-- Danach fehlt nur noch:
--   1) Edge Function "sync-fixtures" deployen
--   2) Supabase SECRET KEY in Vault speichern
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

-- 4) Job nur dann anlegen, wenn der Secret Key bereits im Vault liegt.
do $cron_setup$
declare
  existing_job bigint;
begin
  if not exists (
    select 1
    from vault.decrypted_secrets
    where name = 'fcb_cron_secret_key'
      and decrypted_secret is not null
      and length(decrypted_secret) > 10
  ) then
    raise notice 'fcb_cron_secret_key fehlt noch. Extensions und Log-Tabelle sind eingerichtet; Cronjob wurde noch NICHT angelegt.';
    return;
  end if;

  select jobid into existing_job
  from cron.job
  where jobname = 'fcb-nightly-fixture-sync'
  limit 1;

  if existing_job is not null then
    perform cron.unschedule(existing_job);
  end if;

  perform cron.schedule(
    'fcb-nightly-fixture-sync',
    '0 0,1,2 * * *',
    $job$
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
    $job$
  );

  raise notice 'Cronjob fcb-nightly-fixture-sync wurde angelegt.';
end
$cron_setup$;

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
