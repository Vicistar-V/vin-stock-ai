import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

interface StockQuote {
  ticker: string;
  current_price: number;
  price_change: number;
  change_percent: number;
  high: number;
  low: number;
  open: number;
  previous_close: number;
  volume: number;
}

interface NewsItem {
  ticker: string;
  headline: string;
  summary?: string;
  url: string;
  source: string;
  published_at: string;
  image_url?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const finnhubApiKey = Deno.env.get('FINNHUB_API_KEY');

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🚀 Starting stock data update...');
    console.log(`🔑 Environment check - Has Finnhub API key: ${!!finnhubApiKey}, Key length: ${finnhubApiKey?.length || 0}`);

    // Get all stocks from database
    const { data: stocks, error: stocksError } = await supabase
      .from('stocks')
      .select('ticker');

    if (stocksError) {
      throw new Error(`Failed to fetch stocks: ${stocksError.message}`);
    }

    if (!stocks || stocks.length === 0) {
      throw new Error('No stocks found in database');
    }

    const quotes: StockQuote[] = [];
    const newsItems: NewsItem[] = [];
    const historicalData: any[] = [];

    // Fetch quotes, news, and historical data for all stocks
    for (const stock of stocks) {
      try {
        if (!finnhubApiKey) {
          // Use mock data if no API key
          const mockPrice = 150 + Math.random() * 100;
          const mockChange = (Math.random() - 0.5) * 10;
          const mockPrevClose = mockPrice - mockChange;
          
          quotes.push({
            ticker: stock.ticker,
            current_price: mockPrice,
            price_change: mockChange,
            change_percent: mockPrevClose > 0 ? (mockChange / mockPrevClose) * 100 : 0,
            high: mockPrice + Math.random() * 5,
            low: mockPrice - Math.random() * 5,
            open: mockPrice + (Math.random() - 0.5) * 3,
            previous_close: mockPrevClose,
            volume: Math.floor(Math.random() * 50000000) + 10000000
          });
          continue;
        }

        const response = await fetch(
          `https://finnhub.io/api/v1/quote?symbol=${stock.ticker}&token=${finnhubApiKey}`
        );

        if (!response.ok) {
          console.warn(`Failed to fetch quote for ${stock.ticker}: ${response.status}`);
          continue;
        }

        const quoteData = await response.json();

        if (!quoteData.c || quoteData.c === 0) {
          console.warn(`Invalid quote data for ${stock.ticker}`);
          continue;
        }

        quotes.push({
          ticker: stock.ticker,
          current_price: quoteData.c,
          price_change: quoteData.c - quoteData.pc,
          change_percent: quoteData.pc > 0 ? ((quoteData.c - quoteData.pc) / quoteData.pc) * 100 : 0,
          high: quoteData.h || quoteData.c,
          low: quoteData.l || quoteData.c,
          open: quoteData.o || quoteData.c,
          previous_close: quoteData.pc || quoteData.c,
          volume: quoteData.v || 0
        });

        // Fetch news for this stock
        try {
          const newsResponse = await fetch(
            `https://finnhub.io/api/v1/company-news?symbol=${stock.ticker}&from=${getFromDate()}&to=${getToDate()}&token=${finnhubApiKey}`
          );

          if (newsResponse.ok) {
            const newsData = await newsResponse.json();
            
            // Process and filter news (limit to 5 most recent per stock)
            const processedNews = newsData
              .slice(0, 5)
              .filter((item: any) => item.headline && item.url)
              .map((item: any) => ({
                ticker: stock.ticker,
                headline: item.headline,
                summary: item.summary || '',
                url: item.url,
                source: item.source || 'Finnhub',
                published_at: new Date(item.datetime * 1000).toISOString(),
                image_url: item.image || null
              }));

            newsItems.push(...processedNews);
          }
        } catch (newsError) {
          console.warn(`Failed to fetch news for ${stock.ticker}:`, newsError);
        }

        // Fetch historical data for different timeframes
        if (finnhubApiKey) {
          console.log(`🔍 Starting historical data fetch for ${stock.ticker}`);
          const timeframes = [
            { name: '1D', resolution: '5', from: Math.floor(Date.now() / 1000) - 86400 },
            { name: '5D', resolution: '30', from: Math.floor(Date.now() / 1000) - (5 * 86400) },
            { name: '1M', resolution: 'D', from: Math.floor(Date.now() / 1000) - (30 * 86400) },
            { name: '6M', resolution: 'D', from: Math.floor(Date.now() / 1000) - (180 * 86400) },
            { name: '1Y', resolution: 'W', from: Math.floor(Date.now() / 1000) - (365 * 86400) }
          ];

          for (const timeframe of timeframes) {
            try {
              const url = `https://finnhub.io/api/v1/stock/candle?symbol=${stock.ticker}&resolution=${timeframe.resolution}&from=${timeframe.from}&to=${Math.floor(Date.now() / 1000)}&token=${finnhubApiKey}`;
              console.log(`📊 Fetching ${timeframe.name} data for ${stock.ticker}: ${url}`);
              
              const histResponse = await fetch(url);
              console.log(`📈 Response status for ${stock.ticker} ${timeframe.name}: ${histResponse.status}`);

              if (histResponse.ok) {
                const histData = await histResponse.json();
                console.log(`📋 Raw response for ${stock.ticker} ${timeframe.name}:`, JSON.stringify(histData).substring(0, 200));
                
                if (histData.s === 'ok' && histData.c && histData.t && histData.c.length > 0) {
                  console.log(`✅ Valid data found for ${stock.ticker} ${timeframe.name}: ${histData.c.length} points`);
                  // Process historical data points
                  for (let i = 0; i < histData.c.length; i++) {
                    historicalData.push({
                      ticker: stock.ticker,
                      timeframe: timeframe.name,
                      timestamp: new Date(histData.t[i] * 1000).toISOString(),
                      price: histData.c[i] // closing price
                    });
                  }
                } else {
                  console.warn(`❌ Invalid or empty data for ${stock.ticker} ${timeframe.name}:`, {
                    status: histData.s,
                    hasC: !!histData.c,
                    hasT: !!histData.t,
                    length: histData.c?.length || 0,
                    response: histData
                  });
                }
              } else {
                const errorText = await histResponse.text();
                console.error(`❌ Failed HTTP request for ${stock.ticker} ${timeframe.name}: ${histResponse.status} - ${errorText}`);
              }
              
              // Delay to avoid rate limiting
              await new Promise(resolve => setTimeout(resolve, 100));
            } catch (histError) {
              console.error(`💥 Exception fetching ${timeframe.name} historical data for ${stock.ticker}:`, histError);
            }
          }
          console.log(`📊 Total historical data points collected for ${stock.ticker}: ${historicalData.filter(h => h.ticker === stock.ticker).length}`);
        } else {
          console.log(`⚠️ No Finnhub API key - skipping historical data for ${stock.ticker}`);
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (error) {
        console.error(`Error fetching quote for ${stock.ticker}:`, error);
      }
    }

    if (quotes.length === 0) {
      throw new Error('No valid quotes retrieved');
    }

    // Insert quotes into database
    const { error: insertError } = await supabase
      .from('stock_quotes')
      .insert(quotes);

    if (insertError) {
      throw new Error(`Failed to insert quotes: ${insertError.message}`);
    }

    // Insert news items if any were fetched
    if (newsItems.length > 0) {
      // First, delete old news to prevent duplicates
      for (const ticker of [...new Set(newsItems.map(n => n.ticker))]) {
        await supabase
          .from('news')
          .delete()
          .eq('ticker', ticker);
      }

      // Insert new news items
      const { error: newsError } = await supabase
        .from('news')
        .insert(newsItems);

      if (newsError) {
        console.warn('Failed to insert news:', newsError.message);
      } else {
        console.log(`Successfully inserted ${newsItems.length} news items`);
      }
    }

    // Insert historical data if any were fetched
    console.log(`🗄️ Processing historical data insertion - Total collected: ${historicalData.length}`);
    if (historicalData.length > 0) {
      console.log(`📊 Historical data breakdown by ticker:`, 
        Object.entries(historicalData.reduce((acc, h) => {
          acc[h.ticker] = (acc[h.ticker] || 0) + 1;
          return acc;
        }, {}))
      );
      
      // First, delete old historical data to prevent duplicates
      for (const ticker of [...new Set(historicalData.map(h => h.ticker))]) {
        console.log(`🗑️ Deleting old historical data for ${ticker}`);
        const { error: deleteError } = await supabase
          .from('stock_history')
          .delete()
          .eq('ticker', ticker);
        
        if (deleteError) {
          console.error(`❌ Failed to delete old data for ${ticker}:`, deleteError);
        }
      }

      // Insert new historical data
      console.log(`💾 Inserting ${historicalData.length} historical data points...`);
      console.log(`📋 Sample data points:`, historicalData.slice(0, 3));
      
      const { error: histError } = await supabase
        .from('stock_history')
        .insert(historicalData);

      if (histError) {
        console.error('❌ Failed to insert historical data:', histError.message, histError);
      } else {
        console.log(`✅ Successfully inserted ${historicalData.length} historical data points`);
      }
    } else {
      console.warn(`⚠️ No historical data to insert - array is empty`);
    }

    // Clean up old quotes (keep only last 100 per ticker)
    for (const quote of quotes) {
      const { error: cleanupError } = await supabase
        .rpc('cleanup_old_quotes', { 
          ticker_param: quote.ticker, 
          keep_count: 100 
        })
        .then(() => ({ error: null }))
        .catch(() => {
          // Fallback manual cleanup if RPC doesn't exist
          return supabase
            .from('stock_quotes')
            .delete()
            .eq('ticker', quote.ticker)
            .not('id', 'in', `(
              SELECT id FROM stock_quotes 
              WHERE ticker = '${quote.ticker}' 
              ORDER BY timestamp DESC 
              LIMIT 100
            )`);
        });

      if (cleanupError) {
        console.warn(`Cleanup failed for ${quote.ticker}:`, cleanupError);
      }
    }

    console.log(`Successfully updated ${quotes.length} stock quotes, ${newsItems.length} news items, and ${historicalData.length} historical data points`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        updated_quotes: quotes.length,
        updated_news: newsItems.length,
        updated_historical: historicalData.length,
        tickers: quotes.map(q => q.ticker)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Stock update failed:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

// Helper functions
function getFromDate(): string {
  const date = new Date();
  date.setDate(date.getDate() - 7); // Last 7 days
  return date.toISOString().split('T')[0];
}

function getToDate(): string {
  return new Date().toISOString().split('T')[0];
}
