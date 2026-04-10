-- Poke all active Paperclip company agents every 5 minutes so they actually
-- make progress on the backlog. Paperclip's default heartbeat is 3600s and is
-- not tunable per agent via the creation API, so FounderLens drives the loop.
--
-- The tick function queries validation_workflows for all companies where
-- paperclip_company_id is set, then fans out to each agent's edge function.
-- See supabase/functions/paperclip-agent-tick/index.ts.

SELECT cron.schedule(
  'paperclip-agent-tick-5min',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://phppdhsozkpsquxlfezg.supabase.co/functions/v1/paperclip-agent-tick',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBocHBkaHNvemtwc3F1eGxmZXpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NzIwOTcsImV4cCI6MjA5MDA0ODA5N30.4Gv2-KnfdnBLfzen9HZYvXD5vnmUPtn6MySTF9YhqC0", "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBocHBkaHNvemtwc3F1eGxmZXpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NzIwOTcsImV4cCI6MjA5MDA0ODA5N30.4Gv2-KnfdnBLfzen9HZYvXD5vnmUPtn6MySTF9YhqC0"}'::jsonb,
    body := '{"mode": "all", "wakeReason": "cron-5min"}'::jsonb
  ) as request_id;
  $$
);
