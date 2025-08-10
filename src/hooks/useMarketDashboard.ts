import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface PopularStock {
  ticker: string;
  name: string;
  logo: string;
  price: number;
  changePercent: number;
}

interface MoverItem {
  ticker: string;
  name: string;
  logo: string;
  currentPrice: number;
  changePercent: number;
  priceChange: number;
  volume: number;
}

interface MarketStats {
  total_stocks: number;
  gainers_count: number;
  losers_count: number;
  avg_change: number;
  last_updated: string;
}

interface StockDetail {
  ticker: string;
  name: string;
  logo: string;
  current_price: number;
  price_change: number;
  change_percent: number;
  high: number;
  low: number;
  open: number;
  previous_close: number;
  volume: number;
  market_cap?: number;
}

interface ChartDataPoint {
  timestamp: number;
  price: number;
  date: string;
}

interface DashboardData {
  popular_stocks: PopularStock[];
  market_movers: {
    gainers: MoverItem[];
    losers: MoverItem[];
  };
  market_stats: MarketStats;
  all_chart_data?: Record<string, ChartDataPoint[]>;
  timestamp: number;
}

interface StockDetailData {
  stock_detail: StockDetail;
  chart_data: ChartDataPoint[];
  timestamp: number;
}

// Global cache for both dashboard and individual stock data
let cachedDashboard: DashboardData | null = null;
let cachedStocks: Record<string, StockDetailData> = {};
let cacheTimestamp = 0;
const CACHE_DURATION = 10000; // 10 seconds cache

// Universal hook for both dashboard and individual stock data with timeframe support
export function useMarketDashboard(ticker?: string, timeframe?: string) {
  const cacheKey = ticker ? `${ticker.toUpperCase()}_${timeframe || '1D'}` : 'dashboard';
  const [data, setData] = useState<DashboardData | StockDetailData | null>(
    ticker ? cachedStocks[cacheKey] || null : cachedDashboard
  );
  const [loading, setLoading] = useState(!data);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async (force = false) => {
    const isCached = ticker 
      ? cachedStocks[cacheKey] && Date.now() - cacheTimestamp < CACHE_DURATION
      : cachedDashboard && Date.now() - cacheTimestamp < CACHE_DURATION;

    // Return cached data if still fresh and not forcing refresh
    if (!force && isCached) {
      const cachedData = ticker ? cachedStocks[cacheKey] : cachedDashboard;
      setData(cachedData);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log(`🚀 Fetching ${ticker ? `stock data for ${ticker} (${timeframe || '1D'})` : 'dashboard data'} with atomic RPC...`);
      
      const { data: result, error } = await supabase.rpc('get_market_dashboard_with_timeframe', 
        ticker ? { stock_ticker: ticker.toUpperCase(), selected_timeframe: timeframe || '1D' } : {}
      );
      
      if (error) throw error;

      // Cache the result with proper typing
      const typedResult = result as unknown as (DashboardData | StockDetailData);
      
      if (ticker) {
        cachedStocks[cacheKey] = typedResult as StockDetailData;
      } else {
        cachedDashboard = typedResult as DashboardData;
      }
      
      cacheTimestamp = Date.now();
      setData(typedResult);
      setError(null);
      console.log(`✅ ${ticker ? 'Stock' : 'Dashboard'} data fetched and cached successfully`);
    } catch (err) {
      console.error(`❌ Failed to fetch ${ticker ? 'stock' : 'dashboard'} data:`, err);
      
      // If individual stock fetch fails, try the stock-detail function as fallback
      if (ticker) {
        console.log('🔄 Trying fallback stock-detail function...');
        try {
          const { data: fallbackResult, error: fallbackError } = await supabase.functions.invoke('stock-detail', {
            body: { ticker: ticker.toUpperCase() }
          });
          
          if (fallbackError) throw fallbackError;
          
          if (fallbackResult && fallbackResult.ticker) {
            // Transform the fallback data to match expected format
            const transformedData: StockDetailData = {
              stock_detail: {
                ticker: fallbackResult.ticker,
                name: fallbackResult.name,
                logo: fallbackResult.logo,
                current_price: fallbackResult.current_price,
                price_change: fallbackResult.price_change,
                change_percent: fallbackResult.change_percent,
                high: fallbackResult.high,
                low: fallbackResult.low,
                open: fallbackResult.open,
                previous_close: fallbackResult.previous_close,
                volume: fallbackResult.volume,
                market_cap: fallbackResult.market_cap
              },
              chart_data: [],
              timestamp: Date.now()
            };
            
            cachedStocks[cacheKey] = transformedData;
            cacheTimestamp = Date.now();
            setData(transformedData);
            setError(null);
            console.log('✅ Fallback stock data fetched successfully');
            return;
          }
        } catch (fallbackErr) {
          console.error('❌ Fallback also failed:', fallbackErr);
        }
      }
      
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Set up real-time subscription for cache invalidation
    const subscription = supabase
      .channel(`${ticker ? `stock-${ticker}` : 'dashboard'}-updates`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'stock_quotes'
        },
        () => {
          console.log(`📡 New data detected, refreshing ${ticker || 'dashboard'}...`);
          fetchData(true); // Force refresh on new data
        }
      )
      .subscribe();

    // Auto-refresh disabled

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [ticker, timeframe]);

  return {
    data,
    loading,
    error,
    refresh: () => fetchData(true),
    isDataFresh: ticker 
      ? cachedStocks[cacheKey] && Date.now() - cacheTimestamp < CACHE_DURATION
      : cachedDashboard && Date.now() - cacheTimestamp < CACHE_DURATION
  };
}