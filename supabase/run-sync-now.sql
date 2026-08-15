-- Spieltagssync sofort manuell ausführen.
-- Dieser Lauf erscheint anschließend im History-Log als "Ausgeführt von Admin".

select net.http_post(
  url := (
    select decrypted_secret
    from vault.decrypted_secrets
    where name = 'fcb_project_url'
    limit 1
  ) || '/functions/v1/sync-fixtures',
  headers := jsonb_build_object(
    'Content-Type','application/json',
    'apikey',(
      select decrypted_secret
      from vault.decrypted_secrets
      where name = 'fcb_cron_secret_key'
      limit 1
    )
  ),
  body := jsonb_build_object(
    'force',true,
    'actor','Admin',
    'manual',true,
    'requested_at',now()
  ),
  timeout_milliseconds := 30000
) as request_id;
