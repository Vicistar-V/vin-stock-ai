import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openRouterApiKey = Deno.env.get('OPENROUTER_API_KEY');
const finnhubApiKey = Deno.env.get('FINNHUB_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StockQuote {
  c: number; // Current price
  h: number; // High price of the day
  l: number; // Low price of the day
  o: number; // Open price of the day
  pc: number; // Previous close price
  t: number; // Timestamp
}

interface CompanyProfile {
  country: string;
  currency: string;
  exchange: string;
  ipo: string;
  marketCapitalization: number;
  name: string;
  phone: string;
  shareOutstanding: number;
  ticker: string;
  weburl: string;
  logo: string;
  finnhubIndustry: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();
    console.log('Stock search query:', query);

    if (!openRouterApiKey || !finnhubApiKey) {
      throw new Error('Missing API keys');
    }

    // Step 1: Use AI to extract ticker symbol from natural language query
    const tickerResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek/deepseek-chat-v3-0324:free',
        messages: [
          {
            role: 'user',
            content: `${query}\n\nRespond with only the stock ticker symbol (like AAPL, MSFT, GOOGL, AMZN, TSLA, META, NFLX) or UNKNOWN:`
          }
        ],
        temperature: 0,
        max_tokens: 10
      }),
    });

    if (!tickerResponse.ok) {
      throw new Error(`OpenRouter API error: ${tickerResponse.status}`);
    }

    const tickerData = await tickerResponse.json();
    
    // Check if the response has the expected structure
    if (!tickerData.choices || !tickerData.choices[0] || !tickerData.choices[0].message) {
      console.error('Invalid OpenRouter response structure:', tickerData);
      throw new Error('Invalid response from AI service');
    }
    
    const ticker = tickerData.choices[0].message.content.trim().toUpperCase();
    
    console.log('Extracted ticker:', ticker);

    if (ticker === 'UNKNOWN' || !ticker || ticker.length < 1 || ticker.length > 5) {
      return new Response(JSON.stringify({ 
        error: 'Could not identify a valid stock ticker from your query. Please try searching for a publicly traded company (e.g., "Apple", "Microsoft", "TSLA") or a specific ticker symbol.',
        suggestions: ['Try using the company name instead of products', 'Use well-known ticker symbols like AAPL, MSFT, GOOGL', 'Make sure the company is publicly traded']
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Step 2: Get stock quote from Finnhub
    const quoteResponse = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${finnhubApiKey}`
    );

    if (!quoteResponse.ok) {
      throw new Error(`Finnhub quote API error: ${quoteResponse.status}`);
    }

    const quote: StockQuote = await quoteResponse.json();

    // Step 3: Get company profile from Finnhub
    const profileResponse = await fetch(
      `https://finnhub.io/api/v1/stock/profile2?symbol=${ticker}&token=${finnhubApiKey}`
    );

    let profile: CompanyProfile | null = null;
    if (profileResponse.ok) {
      profile = await profileResponse.json();
    }

    // Check if we got valid data
    if (!quote.c || quote.c === 0) {
      return new Response(JSON.stringify({ 
        error: `No stock data found for ticker "${ticker}". Please check if this is a valid stock symbol.` 
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Calculate price change and percentage
    const priceChange = quote.c - quote.pc;
    const priceChangePercent = ((priceChange / quote.pc) * 100);

    const result = {
      ticker,
      currentPrice: quote.c,
      previousClose: quote.pc,
      dayHigh: quote.h,
      dayLow: quote.l,
      openPrice: quote.o,
      priceChange,
      priceChangePercent,
      timestamp: quote.t,
      company: profile ? {
        name: profile.name,
        logo: profile.logo,
        country: profile.country,
        currency: profile.currency,
        exchange: profile.exchange,
        marketCap: profile.marketCapitalization,
        industry: profile.finnhubIndustry,
        website: profile.weburl
      } : null
    };

    console.log('Stock data result:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in stock-search function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to search for stock information' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});