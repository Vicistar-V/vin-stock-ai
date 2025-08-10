-- Drop the conflicting function and create a clean one
DROP FUNCTION IF EXISTS get_market_dashboard();
DROP FUNCTION IF EXISTS get_market_dashboard(TEXT);

-- Create a single unified function that handles both cases
CREATE OR REPLACE FUNCTION get_market_dashboard(stock_ticker TEXT DEFAULT NULL)
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
    WHERE (stock_ticker IS NULL OR sq.ticker = UPPER(stock_ticker))
    ORDER BY sq.ticker, sq.timestamp DESC
  ),
  stock_detail AS (
    SELECT 
      ticker, name, logo, current_price, price_change, change_percent,
      high, low, open, previous_close, volume, market_cap
    FROM latest_quotes 
    WHERE stock_ticker IS NOT NULL AND ticker = UPPER(stock_ticker)
  ),
  chart_data AS (
    SELECT 
      sq.ticker,
      json_agg(
        json_build_object(
          'timestamp', extract(epoch from sq.timestamp) * 1000,
          'price', sq.current_price,
          'date', sq.timestamp
        ) ORDER BY sq.timestamp ASC
      ) as history
    FROM stock_quotes sq
    WHERE (stock_ticker IS NULL OR sq.ticker = UPPER(stock_ticker))
    AND sq.timestamp >= NOW() - INTERVAL '30 days'
    GROUP BY sq.ticker
  ),
  top_gainers AS (
    SELECT 
      ticker, name, logo, current_price, change_percent, price_change, volume
    FROM latest_quotes 
    WHERE change_percent > 0 AND stock_ticker IS NULL
    ORDER BY change_percent DESC 
    LIMIT 10
  ),
  top_losers AS (
    SELECT 
      ticker, name, logo, current_price, change_percent, price_change, volume
    FROM latest_quotes 
    WHERE change_percent < 0 AND stock_ticker IS NULL
    ORDER BY change_percent ASC 
    LIMIT 10
  ),
  popular_stocks AS (
    SELECT 
      ticker, name, logo, current_price as price, change_percent
    FROM latest_quotes 
    WHERE stock_ticker IS NULL
    ORDER BY 
      CASE ticker 
        WHEN 'AAPL' THEN 1 WHEN 'MSFT' THEN 2 WHEN 'GOOGL' THEN 3 
        WHEN 'TSLA' THEN 4 WHEN 'AMZN' THEN 5 WHEN 'NVDA' THEN 6 
        WHEN 'META' THEN 7 WHEN 'JPM' THEN 8 WHEN 'NFLX' THEN 9 
        WHEN 'V' THEN 10 ELSE 99 
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
    WHERE stock_ticker IS NULL
  )
  SELECT 
    CASE 
      WHEN stock_ticker IS NOT NULL THEN
        -- Return individual stock detail with chart data
        json_build_object(
          'stock_detail', (SELECT row_to_json(stock_detail) FROM stock_detail),
          'chart_data', (SELECT history FROM chart_data WHERE ticker = UPPER(stock_ticker)),
          'timestamp', extract(epoch from now()) * 1000
        )
      ELSE
        -- Return full dashboard data
        json_build_object(
          'popular_stocks', (SELECT json_agg(row_to_json(popular_stocks)) FROM popular_stocks),
          'market_movers', json_build_object(
            'gainers', (SELECT json_agg(row_to_json(top_gainers)) FROM top_gainers),
            'losers', (SELECT json_agg(row_to_json(top_losers)) FROM top_losers)
          ),
          'market_stats', (SELECT row_to_json(market_stats) FROM market_stats),
          'all_chart_data', (SELECT json_object_agg(ticker, history) FROM chart_data),
          'timestamp', extract(epoch from now()) * 1000
        )
    END INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_market_dashboard(TEXT) TO anon, authenticated;