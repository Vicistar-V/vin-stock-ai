-- First, let's unschedule the old cron job
SELECT cron.unschedule('stock-data-update');

-- Create a simpler test cron job that runs every minute
SELECT cron.schedule(
  'stock-data-updater-test',
  '* * * * *', -- Every minute for testing
  $$
  INSERT INTO stock_quotes (ticker, current_price, price_change, change_percent, high, low, open, previous_close, volume)
  SELECT 
    ticker,
    current_price + (random() - 0.5) * 2, -- Small price variation
    (random() - 0.5) * 2,
    (random() - 0.5) * 5,
    high + random(),
    low - random(),
    open + (random() - 0.5),
    previous_close,
    volume + floor(random() * 1000000)
  FROM (
    SELECT DISTINCT ON (ticker) *
    FROM stock_quotes
    ORDER BY ticker, timestamp DESC
  ) latest_quotes;
  $$
);