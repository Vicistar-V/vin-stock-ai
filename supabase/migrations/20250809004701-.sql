-- Clean up all versions of the function
DROP FUNCTION IF EXISTS get_market_dashboard() CASCADE;
DROP FUNCTION IF EXISTS get_market_dashboard(TEXT) CASCADE;

-- Create the single clean function
CREATE FUNCTION get_market_dashboard(stock_ticker TEXT DEFAULT NULL)
RETURNS JSON 
LANGUAGE plpgsql 
SECURITY DEFINER 
STABLE
SET search_path = public
AS $$
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
    WHERE (stock_ticker IS NULL OR sq.ticker = UPPER(stock_ticker))
    ORDER BY sq.ticker, sq.timestamp DESC
  ),
  dashboard_data AS (
    SELECT 
      json_build_object(
        'popular_stocks', json_agg(
          json_build_object(
            'ticker', lq.ticker,
            'name', lq.name,
            'logo', lq.logo,
            'price', lq.current_price,
            'changePercent', lq.change_percent
          )
        ) FILTER (WHERE stock_ticker IS NULL),
        'market_movers', json_build_object(
          'gainers', (
            SELECT json_agg(json_build_object(
              'ticker', ticker, 'name', name, 'logo', logo,
              'currentPrice', current_price, 'changePercent', change_percent,
              'priceChange', price_change, 'volume', volume
            ))
            FROM latest_quotes 
            WHERE change_percent > 0 AND stock_ticker IS NULL
            ORDER BY change_percent DESC LIMIT 5
          ),
          'losers', (
            SELECT json_agg(json_build_object(
              'ticker', ticker, 'name', name, 'logo', logo,
              'currentPrice', current_price, 'changePercent', change_percent,
              'priceChange', price_change, 'volume', volume
            ))
            FROM latest_quotes 
            WHERE change_percent < 0 AND stock_ticker IS NULL
            ORDER BY change_percent ASC LIMIT 5
          )
        ),
        'market_stats', json_build_object(
          'total_stocks', COUNT(*),
          'gainers_count', COUNT(*) FILTER (WHERE change_percent > 0),
          'losers_count', COUNT(*) FILTER (WHERE change_percent < 0),
          'avg_change', AVG(change_percent),
          'last_updated', MAX(timestamp)
        ),
        'timestamp', extract(epoch from now()) * 1000
      ) as dashboard
    FROM latest_quotes lq
    WHERE stock_ticker IS NULL
  ),
  stock_data AS (
    SELECT 
      json_build_object(
        'stock_detail', json_build_object(
          'ticker', lq.ticker,
          'name', lq.name,
          'logo', lq.logo,
          'current_price', lq.current_price,
          'price_change', lq.price_change,
          'change_percent', lq.change_percent,
          'high', lq.high,
          'low', lq.low,
          'open', lq.open,
          'previous_close', lq.previous_close,
          'volume', lq.volume,
          'market_cap', lq.market_cap
        ),
        'chart_data', (
          SELECT json_agg(
            json_build_object(
              'timestamp', extract(epoch from sq.timestamp) * 1000,
              'price', sq.current_price,
              'date', sq.timestamp
            ) ORDER BY sq.timestamp ASC
          )
          FROM stock_quotes sq
          WHERE sq.ticker = UPPER(stock_ticker)
          AND sq.timestamp >= NOW() - INTERVAL '30 days'
        ),
        'timestamp', extract(epoch from now()) * 1000
      ) as stock_detail
    FROM latest_quotes lq
    WHERE stock_ticker IS NOT NULL AND lq.ticker = UPPER(stock_ticker)
  )
  SELECT 
    CASE 
      WHEN stock_ticker IS NOT NULL THEN 
        (SELECT stock_detail FROM stock_data)
      ELSE 
        (SELECT dashboard FROM dashboard_data)
    END INTO result;
  
  RETURN result;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_market_dashboard(TEXT) TO anon, authenticated;