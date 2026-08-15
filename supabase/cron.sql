-- FC Bayern Termin-Sync: täglich um 02:00 Uhr Europe/Berlin
-- Aus DST-Gründen wird die Edge Function um 00:00, 01:00 und 02:00 UTC aufgerufen.
-- Die Function führt pro Berliner Kalendertag exakt einen echten Sync aus.
-- Beim Sprung auf Sommerzeit existiert 02:00 lokal nicht; an diesem Tag läuft sie um 03:00.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- EINMALIG im SQL Editor:
-- 1) Im Dashboard unter Settings > API Keys einen SECRET Key verwenden.
-- 2) Diesen Secret Key NICHT in GitHub speichern.
-- 3) Die folgenden beiden Secrets in Vault anlegen; SECRET_KEY_HIER vorher ersetzen.

select vault.create_secret(
  'https://kmhadzujovvxvpgblgkk.supabase.co',
  'fcb_project_url'
);

-- Nur im Supabase SQL Editor ersetzen und ausführen:
-- select vault.create_secret('SECRET_KEY_HIER', 'fcb_cron_secret_key');

-- Erst ausführen, NACHDEM fcb_cron_secret_key in Vault existiert
-- und die Edge Function "sync-fixtures" deployed wurde.

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

-- Kontrolle:
-- select * from cron.job where jobname = 'fcb-nightly-fixture-sync';
-- select * from cron.job_run_details order by start_time desc limit 20;
-- select * from public.fixture_sync_runs order by started_at desc limit 20;
