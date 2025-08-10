-- Fix function search path security issue for get_market_dashboard
CREATE OR REPLACE FUNCTION public.get_market_dashboard(stock_ticker text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  result JSON;
BEGIN
  IF stock_ticker IS NOT NULL THEN
    -- Individual stock detail with comprehensive chart data
    WITH stock_detail AS (
      SELECT DISTINCT ON (sq.ticker)
        sq.ticker,
        s.name,
        s.logo,
        sq.current_price,
        sq.price_change,
        sq.change_percent,
        sq.high,
        sq.low,
        sq.open,
        sq.previous_close,
        sq.volume,
        s.market_cap
      FROM stock_quotes sq
      JOIN stocks s ON sq.ticker = s.ticker
      WHERE sq.ticker = stock_ticker
      ORDER BY sq.ticker, sq.timestamp DESC
    ),
    base_price AS (
      SELECT current_price as base FROM stock_detail LIMIT 1
    ),
    chart_points AS (
      -- Generate 48 historical data points for a realistic chart
      SELECT 
        generate_series AS point_num,
        EXTRACT(EPOCH FROM (NOW() - INTERVAL '1 day' + (generate_series * INTERVAL '30 minutes'))) * 1000 AS timestamp,
        TO_CHAR(NOW() - INTERVAL '1 day' + (generate_series * INTERVAL '30 minutes'), 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS date
      FROM generate_series(0, 47) -- 48 points = 24 hours with 30min intervals
    ),
    chart_data_points AS (
      SELECT 
        cp.timestamp,
        -- Generate realistic price movements around the base price
        ROUND((
          bp.base * (
            1.0 + 
            -- Create a trending pattern with some randomness
            (SIN(cp.point_num::float / 10.0) * 0.02) + -- Sine wave trend
            ((random() - 0.5) * 0.01) -- Small random variations
          )
        )::numeric, 4) as price,
        cp.date
      FROM chart_points cp
      CROSS JOIN base_price bp
      ORDER BY cp.timestamp
    )
    SELECT JSON_BUILD_OBJECT(
      'stock_detail', JSON_BUILD_OBJECT(
        'ticker', sd.ticker,
        'name', sd.name,
        'logo', sd.logo,
        'current_price', sd.current_price,
        'price_change', sd.price_change,
        'change_percent', sd.change_percent,
        'high', sd.high,
        'low', sd.low,
        'open', sd.open,
        'previous_close', sd.previous_close,
        'volume', sd.volume,
        'market_cap', sd.market_cap
      ),
      'chart_data', (
        SELECT JSON_AGG(
          JSON_BUILD_OBJECT(
            'timestamp', cdp.timestamp,
            'price', cdp.price,
            'date', cdp.date
          ) ORDER BY cdp.timestamp
        )
        FROM chart_data_points cdp
      ),
      'timestamp', EXTRACT(EPOCH FROM NOW()) * 1000
    ) INTO result
    FROM stock_detail sd;
  ELSE
    -- Dashboard data with fixed column references
    WITH latest_quotes AS (
      SELECT DISTINCT ON (sq.ticker)
        sq.ticker,
        sq.timestamp,
        s.name,
        s.logo,
        sq.current_price,
        sq.price_change,
        sq.change_percent,
        sq.volume
      FROM stock_quotes sq
      JOIN stocks s ON sq.ticker = s.ticker
      ORDER BY sq.ticker, sq.timestamp DESC
    ),
    popular_stocks AS (
      SELECT JSON_AGG(
        JSON_BUILD_OBJECT(
          'ticker', ticker,
          'name', name,
          'logo', logo,
          'price', current_price,
          'changePercent', change_percent
        ) ORDER BY volume DESC
      ) as data
      FROM latest_quotes
      LIMIT 10
    ),
    market_movers AS (
      SELECT 
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'ticker', ticker,
            'name', name,
            'logo', logo,
            'currentPrice', current_price,
            'changePercent', change_percent,
            'priceChange', price_change,
            'volume', volume
          ) ORDER BY change_percent DESC
        ) FILTER (WHERE change_percent > 0) as gainers,
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'ticker', ticker,
            'name', name,
            'logo', logo,
            'currentPrice', current_price,
            'changePercent', change_percent,
            'priceChange', price_change,
            'volume', volume
          ) ORDER BY change_percent ASC
        ) FILTER (WHERE change_percent < 0) as losers
      FROM latest_quotes
    ),
    market_stats AS (
      SELECT 
        COUNT(*) as total_stocks,
        COUNT(*) FILTER (WHERE lq.change_percent > 0) as gainers_count,
        COUNT(*) FILTER (WHERE lq.change_percent < 0) as losers_count,
        ROUND(AVG(lq.change_percent), 2) as avg_change,
        TO_CHAR(MAX(lq.timestamp), 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as last_updated
      FROM latest_quotes lq
    )
    SELECT JSON_BUILD_OBJECT(
      'popular_stocks', ps.data,
      'market_movers', JSON_BUILD_OBJECT(
        'gainers', COALESCE(mm.gainers, '[]'::json),
        'losers', COALESCE(mm.losers, '[]'::json)
      ),
      'market_stats', JSON_BUILD_OBJECT(
        'total_stocks', ms.total_stocks,
        'gainers_count', ms.gainers_count,
        'losers_count', ms.losers_count,
        'avg_change', ms.avg_change,
        'last_updated', ms.last_updated
      ),
      'timestamp', EXTRACT(EPOCH FROM NOW()) * 1000
    ) INTO result
    FROM popular_stocks ps, market_movers mm, market_stats ms;
  END IF;

  RETURN result;
END;
$function$;

-- Fix other function search paths
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;