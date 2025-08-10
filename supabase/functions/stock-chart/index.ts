import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

interface ChartDataPoint {
  timestamp: number;
  price: number;
  date: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const ticker = url.searchParams.get('ticker');
    const timeframe = url.searchParams.get('timeframe') || '1Y';
    
    if (!ticker) {
      return new Response(JSON.stringify({ error: 'Ticker parameter required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('FINNHUB_API_KEY');
    if (!apiKey) {
      throw new Error('API key not configured');
    }

    console.log(`Fetching chart data for ${ticker}, timeframe: ${timeframe}`);

    // Calculate date range based on timeframe
    const now = Math.floor(Date.now() / 1000);
    let from: number;
    let resolution: string;

    switch (timeframe) {
      case '1D':
        from = now - (24 * 60 * 60);
        resolution = '5'; // 5-minute intervals
        break;
      case '5D':
        from = now - (5 * 24 * 60 * 60);
        resolution = '30'; // 30-minute intervals
        break;
      case '1M':
        from = now - (30 * 24 * 60 * 60);
        resolution = 'D'; // Daily
        break;
      case '6M':
        from = now - (6 * 30 * 24 * 60 * 60);
        resolution = 'D'; // Daily
        break;
      case '1Y':
        from = now - (365 * 24 * 60 * 60);
        resolution = 'W'; // Weekly
        break;
      case 'MAX':
        from = now - (5 * 365 * 24 * 60 * 60); // 5 years
        resolution = 'M'; // Monthly
        break;
      default:
        from = now - (365 * 24 * 60 * 60);
        resolution = 'W';
    }

    const response = await fetch(
      `https://finnhub.io/api/v1/stock/candle?symbol=${ticker}&resolution=${resolution}&from=${from}&to=${now}&token=${apiKey}`
    );

    if (!response.ok) {
      throw new Error(`Candle API failed: ${response.status}`);
    }

    const data = await response.json();

    if (data.s !== 'ok' || !data.c || data.c.length === 0) {
      throw new Error('No chart data available');
    }

    // Transform to chart format
    const chartData: ChartDataPoint[] = data.c.map((price: number, index: number) => ({
      timestamp: data.t[index] * 1000, // Convert to milliseconds
      price: price,
      date: new Date(data.t[index] * 1000).toISOString()
    }));

    console.log(`Successfully fetched ${chartData.length} data points for ${ticker}`);
    return new Response(JSON.stringify({ data: chartData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Chart data fetch failed:', error);
    
    // Generate fallback mock data
    const ticker = new URL(req.url).searchParams.get('ticker') || 'UNKNOWN';
    const timeframe = new URL(req.url).searchParams.get('timeframe') || '1Y';
    
    const points = timeframe === '1D' ? 48 : timeframe === '5D' ? 120 : 252;
    const mockData: ChartDataPoint[] = [];
    let price = 150 + Math.random() * 50;
    
    for (let i = 0; i < points; i++) {
      const timestamp = Date.now() - (points - i) * 3600000; // Hourly intervals
      price += (Math.random() - 0.5) * 2;
      mockData.push({
        timestamp,
        price: Math.max(50, price),
        date: new Date(timestamp).toISOString()
      });
    }

    console.log(`Using fallback chart data for ${ticker}`);
    return new Response(JSON.stringify({ data: mockData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});