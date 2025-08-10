-- Fix the function with proper aggregation
CREATE OR REPLACE FUNCTION get_market_dashboard(stock_ticker TEXT DEFAULT NULL)
RETURNS JSON 
LANGUAGE plpgsql 
SECURITY DEFINER 
STABLE
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  IF stock_ticker IS NOT NULL THEN
    -- Return individual stock detail
    SELECT json_build_object(
      'stock_detail', json_build_object(
        'ticker', s.ticker,
        'name', s.name,
        'logo', s.logo,
        'current_price', sq.current_price,
        'price_change', sq.price_change,
        'change_percent', sq.change_percent,
        'high', sq.high,
        'low', sq.low,
        'open', sq.open,
        'previous_close', sq.previous_close,
        'volume', sq.volume,
        'market_cap', s.market_cap
      ),
      'chart_data', (
        SELECT json_agg(
          json_build_object(
            'timestamp', extract(epoch from timestamp) * 1000,
            'price', current_price,
            'date', timestamp
          ) ORDER BY timestamp ASC
        )
        FROM stock_quotes
        WHERE ticker = UPPER(stock_ticker)
        AND timestamp >= NOW() - INTERVAL '30 days'
      ),
      'timestamp', extract(epoch from now()) * 1000
    ) INTO result
    FROM stocks s
    JOIN (
      SELECT DISTINCT ON (ticker) *
      FROM stock_quotes
      WHERE ticker = UPPER(stock_ticker)
      ORDER BY ticker, timestamp DESC
    ) sq ON s.ticker = sq.ticker
    WHERE s.ticker = UPPER(stock_ticker);
  ELSE
    -- Return dashboard data
    WITH latest_quotes AS (
      SELECT DISTINCT ON (sq.ticker) 
        sq.ticker, sq.current_price, sq.price_change, sq.change_percent,
        sq.high, sq.low, sq.open, sq.previous_close, sq.volume, sq.timestamp,
        s.name, s.logo, s.market_cap
      FROM stock_quotes sq
      JOIN stocks s ON sq.ticker = s.ticker
      ORDER BY sq.ticker, sq.timestamp DESC
    ),
    gainers AS (
      SELECT json_agg(
        json_build_object(
          'ticker', ticker, 'name', name, 'logo', logo,
          'currentPrice', current_price, 'changePercent', change_percent,
          'priceChange', price_change, 'volume', volume
        )
      ) as data
      FROM (
        SELECT * FROM latest_quotes 
        WHERE change_percent > 0 
        ORDER BY change_percent DESC 
        LIMIT 5
      ) t
    ),
    losers AS (
      SELECT json_agg(
        json_build_object(
          'ticker', ticker, 'name', name, 'logo', logo,
          'currentPrice', current_price, 'changePercent', change_percent,
          'priceChange', price_change, 'volume', volume
        )
      ) as data
      FROM (
        SELECT * FROM latest_quotes 
        WHERE change_percent < 0 
        ORDER BY change_percent ASC 
        LIMIT 5
      ) t
    ),
    popular AS (
      SELECT json_agg(
        json_build_object(
          'ticker', ticker, 'name', name, 'logo', logo,
          'price', current_price, 'changePercent', change_percent
        ) ORDER BY 
          CASE ticker 
            WHEN 'AAPL' THEN 1 WHEN 'MSFT' THEN 2 WHEN 'GOOGL' THEN 3 
            WHEN 'TSLA' THEN 4 WHEN 'AMZN' THEN 5 WHEN 'NVDA' THEN 6 
            WHEN 'META' THEN 7 WHEN 'JPM' THEN 8 WHEN 'NFLX' THEN 9 
            WHEN 'V' THEN 10 ELSE 99 
          END
      ) as data
      FROM latest_quotes
    ),
    stats AS (
      SELECT json_build_object(
        'total_stocks', COUNT(*),
        'gainers_count', COUNT(*) FILTER (WHERE change_percent > 0),
        'losers_count', COUNT(*) FILTER (WHERE change_percent < 0),
        'avg_change', AVG(change_percent),
        'last_updated', MAX(timestamp)
      ) as data
      FROM latest_quotes
    )
    SELECT json_build_object(
      'popular_stocks', (SELECT data FROM popular),
      'market_movers', json_build_object(
        'gainers', (SELECT data FROM gainers),
        'losers', (SELECT data FROM losers)
      ),
      'market_stats', (SELECT data FROM stats),
      'timestamp', extract(epoch from now()) * 1000
    ) INTO result;
  END IF;
  
  RETURN result;
END;
$$;