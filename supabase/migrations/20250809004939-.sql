-- First check if there are any existing cron jobs and remove them
SELECT cron.unschedule(jobname) FROM cron.job WHERE jobname LIKE '%stock%';

-- Create a working cron job that generates realistic mock data every 30 seconds
SELECT cron.schedule(
  'stock-price-simulator',
  '*/30 * * * * *', -- Every 30 seconds
  $$
  INSERT INTO stock_quotes (ticker, current_price, price_change, change_percent, high, low, open, previous_close, volume)
  SELECT 
    s.ticker,
    -- Generate realistic price movements based on previous price
    ROUND(
      GREATEST(
        latest.current_price * (1 + (random() - 0.5) * 0.02), -- +/- 1% max movement
        1.0 -- minimum price of $1
      )::numeric, 4
    ) as new_price,
    ROUND(((random() - 0.5) * latest.current_price * 0.02)::numeric, 4) as price_change,
    ROUND(((random() - 0.5) * 2)::numeric, 4) as change_percent, -- +/- 2% max
    ROUND((latest.high + random() * 2)::numeric, 4) as high,
    ROUND((latest.low - random() * 2)::numeric, 4) as low,
    ROUND((latest.open + (random() - 0.5) * 3)::numeric, 4) as open,
    latest.current_price as previous_close,
    latest.volume + floor(random() * 5000000) as volume
  FROM stocks s
  JOIN (
    SELECT DISTINCT ON (ticker) 
      ticker, current_price, high, low, open, volume
    FROM stock_quotes 
    ORDER BY ticker, timestamp DESC
  ) latest ON s.ticker = latest.ticker;
  $$
);