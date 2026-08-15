-- ============================================================
-- FC Bayern: Cron Bootstrap
-- Projekt: FCBayern_Ober
--
-- Echte Sync-Zeiten in Europe/Berlin:
-- 00:00 / 03:00 / 06:00 / 09:00 / 12:00 / 15:00 / 18:00 / 21:00
--
-- Technisch ruft pg_cron die Function jede volle Stunde auf.
-- Die Edge Function führt nur in den 3-Stunden-Slots einen echten Sync aus.
-- Dadurch bleiben die Uhrzeiten auch bei Sommer-/Winterzeit korrekt.
-- ============================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

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

-- Projekt-URL einmalig im Vault ablegen.
do $$
begin
  if not exists (
    select 1
    from vault.decrypted_secrets
    where name = 'fcb_project_url'
  ) then
    perform vault.create_secret(
      'https://kmhadzujovvxvpgblgkk.supabase.co',
      'fcb_project_url'
    );
  end if;
end $$;

-- Secret Key NICHT in GitHub und NICHT im Chat speichern.
-- Einmalig im SQL Editor:
--
-- select vault.create_secret(
--   'DEIN_SECRET_KEY',
--   'fcb_cron_secret_key'
-- );

do $cron_setup$
declare
  jid bigint;
begin
  if not exists (
    select 1
    from vault.decrypted_secrets
    where name = 'fcb_cron_secret_key'
      and decrypted_secret is not null
      and length(decrypted_secret) > 10
  ) then
    raise notice 'fcb_cron_secret_key fehlt. Cronjob wurde noch nicht angelegt.';
    return;
  end if;

  -- Alte und bereits vorhandene neue Jobs entfernen.
  for jid in
    select jobid
    from cron.job
    where jobname in (
      'fcb-nightly-fixture-sync',
      'fcb-3hour-fixture-sync'
    )
  loop
    perform cron.unschedule(jid);
  end loop;

  perform cron.schedule(
    'fcb-3hour-fixture-sync',
    '0 * * * *',
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

      body := jsonb_build_object(
        'scheduled_at', now()
      ),

      timeout_milliseconds := 30000
    ) as request_id;
    $job$
  );

  raise notice 'Cronjob fcb-3hour-fixture-sync wurde angelegt.';
end
$cron_setup$;

-- Kontrolle
select extname, extversion
from pg_extension
where extname in ('pg_cron','pg_net')
order by extname;

select jobid, jobname, schedule, active
from cron.job
where jobname = 'fcb-3hour-fixture-sync';

select jobid, status, return_message, start_time, end_time
from cron.job_run_details
order by start_time desc
limit 20;

select *
from public.fixture_sync_runs
order by started_at desc
limit 20;
