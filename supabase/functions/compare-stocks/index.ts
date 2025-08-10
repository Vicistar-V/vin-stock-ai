import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log(`📊 compare-stocks started - ${req.method} ${req.url}`);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ticker1, ticker2 } = await req.json();
    
    if (!ticker1 || !ticker2) {
      return new Response(JSON.stringify({ error: 'Both ticker1 and ticker2 are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const openRouterApiKey = Deno.env.get('OPENROUTER_API_KEY');
    const finnhubApiKey = Deno.env.get('FINNHUB_API_KEY');

    if (!openRouterApiKey || !finnhubApiKey) {
      throw new Error('Required API keys not configured');
    }

    console.log(`🔍 Fetching data for ${ticker1} vs ${ticker2}`);

    // Fetch data for both companies with error handling
    const fetchCompanyData = async (ticker: string) => {
      try {
        const [quoteRes, profileRes, metricsRes] = await Promise.all([
          fetch(`https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${finnhubApiKey}`),
          fetch(`https://finnhub.io/api/v1/stock/profile2?symbol=${ticker}&token=${finnhubApiKey}`),
          fetch(`https://finnhub.io/api/v1/stock/metric?symbol=${ticker}&metric=all&token=${finnhubApiKey}`)
        ]);

        // Check for API errors
        if (!quoteRes.ok || !profileRes.ok || !metricsRes.ok) {
          throw new Error(`API error: ${quoteRes.status} ${profileRes.status} ${metricsRes.status}`);
        }

        const [quote, profile, metrics] = await Promise.all([
          quoteRes.json(),
          profileRes.json(),
          metricsRes.json()
        ]);

        return { quote, profile, metrics: metrics?.metric || {} };
      } catch (error) {
        console.error(`Error fetching data for ${ticker}:`, error);
        // Return fallback data structure
        return { 
          quote: { c: 0 }, 
          profile: { name: ticker }, 
          metrics: {} 
        };
      }
    };

    const [company1Data, company2Data] = await Promise.all([
      fetchCompanyData(ticker1),
      fetchCompanyData(ticker2)
    ]);

    // Build comparison prompt
    const prompt = `You are an unbiased, expert financial analyst. Your task is to provide a head-to-head comparison of two companies based ONLY on the data provided below. Do not use any outside knowledge.

--- DATA FOR COMPANY 1 (${ticker1}) ---
Profile: ${company1Data.profile.name || ticker1} - ${company1Data.profile.finnhubIndustry || 'Unknown Industry'}
Market Cap: $${company1Data.profile.marketCapitalization || 'N/A'}M
Current Price: $${company1Data.quote.c || 'N/A'}
P/E Ratio: ${company1Data.metrics.peTTM || 'N/A'}
EPS: $${company1Data.metrics.epsTTM || 'N/A'}
ROE: ${company1Data.metrics.roeTTM || 'N/A'}%
Debt/Equity: ${company1Data.metrics.totalDebtToEquityQuarterly || 'N/A'}
---

--- DATA FOR COMPANY 2 (${ticker2}) ---
Profile: ${company2Data.profile.name || ticker2} - ${company2Data.profile.finnhubIndustry || 'Unknown Industry'}
Market Cap: $${company2Data.profile.marketCapitalization || 'N/A'}M
Current Price: $${company2Data.quote.c || 'N/A'}
P/E Ratio: ${company2Data.metrics.peTTM || 'N/A'}
EPS: $${company2Data.metrics.epsTTM || 'N/A'}
ROE: ${company2Data.metrics.roeTTM || 'N/A'}%
Debt/Equity: ${company2Data.metrics.totalDebtToEquityQuarterly || 'N/A'}
---

Now, provide a balanced narrative comparison in JSON format with the following structure. Be analytical and insightful.

{
  "valuation_summary": "Compare their valuation metrics. Who seems more expensive and why?",
  "financials_summary": "Compare their financial health and growth. Who is growing faster or has a stronger balance sheet?",
  "momentum_summary": "Based on their current market position, who seems to have more positive momentum?",
  "winner": "Based on the analysis, which company appears more attractive for investment and why?"
}`;

    console.log('🤖 Sending to OpenRouter for comparison...');
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://vinstock.ai',
        'X-Title': 'Vin Stock Comparison Tool'
      },
      body: JSON.stringify({
        model: 'deepseek/deepseek-chat-v3-0324:free',
        messages: [
          { 
            role: 'system', 
            content: 'You are an expert financial analyst. Respond only with valid JSON in the exact format requested.' 
          },
          { role: 'user', content: prompt }
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter API error:', response.status, errorText);
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const aiData = await response.json();
    const analysis = aiData.choices[0]?.message?.content;

    if (!analysis) {
      throw new Error('No analysis content received from AI');
    }

    let comparisonData;
    try {
      comparisonData = JSON.parse(analysis);
    } catch (error) {
      console.error('Failed to parse AI response as JSON:', error);
      throw new Error('Invalid JSON response from AI');
    }

    return new Response(JSON.stringify({
      success: true,
      ticker1,
      ticker2,
      comparison: comparisonData,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('❌ compare-stocks error:', err);
    return new Response(JSON.stringify({ 
      success: false, 
      error: err.message 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});