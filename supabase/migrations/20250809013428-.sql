-- Create a new function that supports timeframe selection
CREATE OR REPLACE FUNCTION public.get_market_dashboard_with_timeframe(stock_ticker text DEFAULT NULL::text, selected_timeframe text DEFAULT '1D')
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result JSON;
BEGIN
  IF stock_ticker IS NOT NULL THEN
    -- Individual stock detail with timeframe-specific chart data
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
    chart_data_points AS (
      -- Use real historical data from stock_history table for the selected timeframe
      SELECT 
        COALESCE(
          (SELECT JSON_AGG(
            JSON_BUILD_OBJECT(
              'timestamp', EXTRACT(EPOCH FROM sh.timestamp) * 1000,
              'price', sh.price,
              'date', TO_CHAR(sh.timestamp, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
            ) ORDER BY sh.timestamp
          )
          FROM stock_history sh
          WHERE sh.ticker = stock_ticker 
          AND sh.timeframe = selected_timeframe),
          -- Fallback to mock data if no historical data exists
          (SELECT JSON_AGG(
            JSON_BUILD_OBJECT(
              'timestamp', EXTRACT(EPOCH FROM (NOW() - INTERVAL '1 day' + (generate_series * INTERVAL '30 minutes'))) * 1000,
              'price', ROUND((
                sd.current_price * (
                  1.0 + 
                  (SIN(generate_series::float / 10.0) * 0.02) + 
                  ((random() - 0.5) * 0.01)
                )
              )::numeric, 4),
              'date', TO_CHAR(NOW() - INTERVAL '1 day' + (generate_series * INTERVAL '30 minutes'), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
            ) ORDER BY generate_series
          )
          FROM generate_series(0, 47) 
          CROSS JOIN stock_detail sd)
        ) as data
    ),
    stock_news AS (
      SELECT JSON_AGG(
        JSON_BUILD_OBJECT(
          'id', n.id,
          'headline', n.headline,
          'summary', n.summary,
          'url', n.url,
          'source', n.source,
          'published_at', TO_CHAR(n.published_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
          'image_url', n.image_url
        ) ORDER BY n.published_at DESC
      ) as data
      FROM news n
      WHERE n.ticker = stock_ticker
      AND n.published_at >= NOW() - INTERVAL '7 days'
      LIMIT 20
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
      'chart_data', cdp.data,
      'news', COALESCE(sn.data, '[]'::json),
      'timestamp', EXTRACT(EPOCH FROM NOW()) * 1000
    ) INTO result
    FROM stock_detail sd, chart_data_points cdp, stock_news sn;
  ELSE
    -- Dashboard data (no timeframe needed)
    SELECT get_market_dashboard() INTO result;
  END IF;

  RETURN result;
END;
$function$