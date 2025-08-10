-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create the cron job to update stock data every 30 seconds
SELECT cron.schedule(
  'stock-data-updater-30s',
  '*/1 * * * *', -- Every minute (minimum interval for pg_cron)
  $$
  SELECT net.http_post(
    url := 'https://dzewmhtvwedccxtjaqnz.supabase.co/functions/v1/stock-data-updater',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6ZXdtaHR2d2VkY2N4dGphcW56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4NDk0MTIsImV4cCI6MjA2OTQyNTQxMn0.HS1C6AIeii7YO08TYkVWoj7T_JkDxq8kwBz6H1u2qhE"}'::jsonb,
    body := '{"trigger": "cron"}'::jsonb
  ) as request_id;
  $$
);