-- Create an atomic RPC function that fetches everything in one blazing fast query
CREATE OR REPLACE FUNCTION get_market_dashboard()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  -- Single atomic query with CTEs for maximum performance
  WITH latest_quotes AS (
    SELECT DISTINCT ON (sq.ticker) 
      sq.ticker,
      sq.current_price,
      sq.price_change,
      sq.change_percent,
      sq.high,
      sq.low,
      sq.open,
      sq.previous_close,
      sq.volume,
      sq.timestamp,
      s.name,
      s.logo,
      s.market_cap
    FROM stock_quotes sq
    JOIN stocks s ON sq.ticker = s.ticker
    ORDER BY sq.ticker, sq.timestamp DESC
  ),
  top_gainers AS (
    SELECT 
      ticker, name, logo, current_price, change_percent, price_change, volume
    FROM latest_quotes 
    WHERE change_percent > 0
    ORDER BY change_percent DESC 
    LIMIT 10
  ),
  top_losers AS (
    SELECT 
      ticker, name, logo, current_price, change_percent, price_change, volume
    FROM latest_quotes 
    WHERE change_percent < 0
    ORDER BY change_percent ASC 
    LIMIT 10
  ),
  popular_stocks AS (
    SELECT 
      ticker, name, logo, current_price as price, change_percent
    FROM latest_quotes 
    ORDER BY 
      CASE ticker 
        WHEN 'AAPL' THEN 1 
        WHEN 'MSFT' THEN 2 
        WHEN 'GOOGL' THEN 3 
        WHEN 'TSLA' THEN 4 
        WHEN 'AMZN' THEN 5 
        WHEN 'NVDA' THEN 6 
        WHEN 'META' THEN 7 
        WHEN 'JPM' THEN 8 
        WHEN 'NFLX' THEN 9 
        WHEN 'V' THEN 10 
        ELSE 99 
      END
  ),
  market_stats AS (
    SELECT 
      COUNT(*) as total_stocks,
      COUNT(CASE WHEN change_percent > 0 THEN 1 END) as gainers_count,
      COUNT(CASE WHEN change_percent < 0 THEN 1 END) as losers_count,
      AVG(change_percent) as avg_change,
      MAX(timestamp) as last_updated
    FROM latest_quotes
  )
  SELECT json_build_object(
    'popular_stocks', (SELECT json_agg(row_to_json(popular_stocks)) FROM popular_stocks),
    'market_movers', json_build_object(
      'gainers', (SELECT json_agg(row_to_json(top_gainers)) FROM top_gainers),
      'losers', (SELECT json_agg(row_to_json(top_losers)) FROM top_losers)
    ),
    'market_stats', (SELECT row_to_json(market_stats) FROM market_stats),
    'timestamp', extract(epoch from now()) * 1000
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create optimized indexes for blazing performance
CREATE INDEX IF NOT EXISTS idx_stock_quotes_ticker_timestamp_desc ON stock_quotes(ticker, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_stock_quotes_change_percent_desc ON stock_quotes(change_percent DESC);
CREATE INDEX IF NOT EXISTS idx_stock_quotes_timestamp_desc ON stock_quotes(timestamp DESC);

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_market_dashboard() TO anon, authenticated;