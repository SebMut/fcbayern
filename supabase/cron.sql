-- SeasonCrew Spieltagssync über OpenLigaDB
-- Echte Syncs in Europe/Berlin:
-- 00:00, 03:00, 06:00, 09:00, 12:00, 15:00, 18:00, 21:00.
--
-- Supabase-Datenbanken laufen standardmäßig in UTC.
-- Deshalb ruft pg_cron die Edge Function JEDE volle Stunde auf.
-- Die Edge Function prüft Europe/Berlin und führt nur bei Stunde % 3 = 0
-- einen echten OpenLigaDB-Abruf aus. So bleibt der Rhythmus bei Sommer-/Winterzeit korrekt.
-- Pro echtem Lauf werden derzeit maximal drei OpenLigaDB-Endpunkte abgefragt
-- (Bundesliga, DFB-Pokal, Champions League).

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Alte Jobnamen und den aktuellen Job entfernen, falls vorhanden.
do $$
declare
  jid bigint;
begin
  for jid in
    select jobid
    from cron.job
    where jobname in (
      'fcb-nightly-fixture-sync',
      'fcb-3hour-fixture-sync',
      'seasoncrew-openligadb-fixture-sync'
    )
  loop
    perform cron.unschedule(jid);
  end loop;
end $$;

-- Voraussetzung:
-- Vault-Secrets:
--   fcb_project_url
--   fcb_cron_secret_key
-- Die historischen Secret-Namen bleiben vorerst erhalten, obwohl SeasonCrew
-- inzwischen vereinsneutral aufgebaut wird.

select cron.schedule(
  'seasoncrew-openligadb-fixture-sync',

  -- Technischer Aufruf stündlich.
  -- Die Edge Function lässt nur 00/03/06/09/12/15/18/21 Uhr Berlin durch.
  '0 * * * *',

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

    body := jsonb_build_object(
      'scheduled_at', now()
    ),

    timeout_milliseconds := 30000
  ) as request_id;
  $$
);

-- Kontrolle:
select jobid, jobname, schedule, active
from cron.job
where jobname = 'seasoncrew-openligadb-fixture-sync';

-- Letzte technischen Cron-Aufrufe:
select jobid, status, return_message, start_time, end_time
from cron.job_run_details
order by start_time desc
limit 20;

-- Letzte ECHTEN Spieltagssyncs:
select *
from public.fixture_sync_runs
order by started_at desc
limit 20;
