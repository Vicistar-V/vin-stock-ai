-- Create function to clean up old quotes
CREATE OR REPLACE FUNCTION cleanup_old_quotes(ticker_param TEXT, keep_count INTEGER)
RETURNS void AS $$
BEGIN
  DELETE FROM stock_quotes 
  WHERE ticker = ticker_param 
  AND id NOT IN (
    SELECT id FROM stock_quotes 
    WHERE ticker = ticker_param 
    ORDER BY timestamp DESC 
    LIMIT keep_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Set up pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the stock data updater to run every 30 seconds
SELECT cron.schedule(
  'stock-data-update', 
  '*/30 * * * * *', -- Every 30 seconds
  $$
  SELECT net.http_post(
    url := 'https://dzewmhtvwedccxtjaqnz.supabase.co/functions/v1/stock-data-updater',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6ZXdtaHR2d2VkY2N4dGphcW56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4NDk0MTIsImV4cCI6MjA2OTQyNTQxMn0.HS1C6AIeii7YO08TYkVWoj7T_JkDxq8kwBz6H1u2qhE"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);