-- Update get_market_dashboard function to use real historical data
CREATE OR REPLACE FUNCTION public.get_market_dashboard(stock_ticker text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result JSON;
BEGIN
  IF stock_ticker IS NOT NULL THEN
    -- Individual stock detail with real historical chart data and news
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
      -- Use real historical data from stock_history table, fallback to mock if empty
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
          AND sh.timeframe = '1D'
          AND sh.timestamp >= NOW() - INTERVAL '1 day'),
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
$function$