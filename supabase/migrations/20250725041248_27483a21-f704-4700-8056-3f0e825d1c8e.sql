-- Set up cron jobs for automation
SELECT cron.schedule(
  'automation-engine-hourly',
  '0 * * * *', -- Every hour
  $$
  SELECT net.http_post(
    url := 'https://nxzfubxujyfvwifyffvb.supabase.co/functions/v1/automated-scheduler',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54emZ1Ynh1anlmdndpZnlmZnZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4NTYzNzMsImV4cCI6MjA2ODQzMjM3M30.tlKSlwNGWsrFB-pTB-PSOYogBIyd62y2uq1gY7jc49g"}'::jsonb,
    body := '{"action": "run_all_automations"}'::jsonb
  ) as request_id;
  $$
);