import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');
const FINNHUB_API_KEY = Deno.env.get('FINNHUB_API_KEY');

interface ScreenerParams {
  industry?: string;
  minMarketCap?: number;
  maxMarketCap?: number;
  minPE?: number;
  maxPE?: number;
  minDividendYield?: number;
  country?: string;
  keywords?: string[];
}

interface StockResult {
  symbol: string;
  description: string;
  displaySymbol: string;
  type: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('🧠 AI Screener started');

  try {
    const { query } = await req.json();

    if (!query) {
      return new Response(
        JSON.stringify({ success: false, error: 'Query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📝 User query:', query);

    // Single AI call - recommend from database stocks only
    console.log('🚀 Generating recommendations from available stocks...');
    
    const combinedPrompt = `You are a stock screener AI. Given the user's investment query, recommend 3-5 stocks from this specific list ONLY:

Available stocks: AAPL (Apple), MSFT (Microsoft), GOOGL (Alphabet/Google), META (Meta/Facebook), NVDA (NVIDIA), AMZN (Amazon), TSLA (Tesla), JPM (JPMorgan), NFLX (Netflix)

User Query: "${query}"

Choose the BEST matches from the available list above. Do NOT recommend any stocks not on this list.

Respond with JSON only:
{
  "interpretation": "Brief restatement of user intent",
  "suggestions": [
    {"ticker": "AAPL", "name": "Apple Inc", "justification": "Short reason why it matches from available options"},
    {"ticker": "MSFT", "name": "Microsoft Corp", "justification": "Short reason why it matches from available options"}
  ]
}`;

    const aiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek/deepseek-chat-v3-0324:free',
        messages: [
          { role: 'user', content: combinedPrompt }
        ],
        temperature: 0.1,
        max_tokens: 800,
      }),
    });

    const aiData = await aiResponse.json();
    let result;
    
    try {
      let responseContent = aiData.choices[0].message.content;
      responseContent = responseContent.replace(/```json\s*|\s*```/g, '').trim();
      
      const parsedResult = JSON.parse(responseContent);
      console.log('✅ Generated recommendations:', parsedResult.suggestions.length, 'stocks');
      
      result = {
        success: true,
        query_interpretation: parsedResult.interpretation,
        suggestions: parsedResult.suggestions,
        timestamp: new Date().toISOString()
      };
      
    } catch (e) {
      console.error('Failed to parse AI response:', e);
      console.log('Raw response:', aiData.choices[0].message.content);
      
      // Fast fallback with stocks that are definitely in the database
      const fallbackSuggestions = [
        { ticker: "AAPL", name: "Apple Inc", justification: "Industry-leading technology company with strong fundamentals and innovation track record." },
        { ticker: "MSFT", name: "Microsoft Corp", justification: "Dominant enterprise software and cloud computing platform with consistent growth." },
        { ticker: "GOOGL", name: "Alphabet Inc", justification: "Leading search and digital advertising platform with AI and cloud capabilities." }
      ];
      
      result = {
        success: true,
        query_interpretation: `Investment ideas matching: ${query}`,
        suggestions: fallbackSuggestions,
        timestamp: new Date().toISOString()
      };
    }

    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ AI Screener error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'An unexpected error occurred while generating investment ideas.' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});