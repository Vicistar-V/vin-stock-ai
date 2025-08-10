import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openRouterApiKey = Deno.env.get('OPENROUTER_API_KEY');
const finnhubApiKey = Deno.env.get('FINNHUB_API_KEY');

interface HoldingData {
  ticker: string;
  shares: number;
  currentPrice: number;
  value: number;
  sector: string;
  name: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { holdings } = await req.json();
    console.log('Analyzing portfolio with natural language:', holdings);

    // Step 1: Use AI to parse natural language input into structured data
    const parsedHoldings = await parseHoldingsWithAI(holdings);
    console.log('AI parsed holdings:', parsedHoldings);

    if (parsedHoldings.length === 0) {
      throw new Error('No valid holdings found in input');
    }

    // Step 2: Get stock data for each holding
    const holdingsData: HoldingData[] = [];
    
    for (const holding of parsedHoldings) {
      try {
        console.log(`Fetching data for ${holding.ticker}`);
        
        // Get current price from Finnhub
        const priceResponse = await fetch(
          `https://finnhub.io/api/v1/quote?symbol=${holding.ticker}&token=${finnhubApiKey}`
        );
        const priceData = await priceResponse.json();
        
        if (!priceData.c || priceData.c === 0) {
          console.log(`No price data for ${holding.ticker}, skipping`);
          continue;
        }

        // Get company profile for sector and name
        const profileResponse = await fetch(
          `https://finnhub.io/api/v1/stock/profile2?symbol=${holding.ticker}&token=${finnhubApiKey}`
        );
        const profileData = await profileResponse.json();

        const currentPrice = priceData.c;
        const value = currentPrice * holding.shares;
        
        holdingsData.push({
          ticker: holding.ticker,
          shares: holding.shares,
          currentPrice: currentPrice,
          value: value,
          sector: profileData.finnhubIndustry || 'Unknown',
          name: profileData.name || holding.ticker
        });

        console.log(`Added ${holding.ticker}: $${currentPrice} x ${holding.shares} = $${value}`);
      } catch (error) {
        console.error(`Error fetching data for ${holding.ticker}:`, error);
        continue;
      }
    }

    if (holdingsData.length === 0) {
      throw new Error('Could not fetch data for any holdings');
    }

    // Step 3: Calculate portfolio metrics
    const totalValue = holdingsData.reduce((sum, holding) => sum + holding.value, 0);
    
    const sectorMap = new Map<string, number>();
    holdingsData.forEach(holding => {
      const currentValue = sectorMap.get(holding.sector) || 0;
      sectorMap.set(holding.sector, currentValue + holding.value);
    });

    const sectorBreakdown = Array.from(sectorMap.entries()).map(([sector, value]) => ({
      sector,
      value,
      percentage: (value / totalValue) * 100
    })).sort((a, b) => b.value - a.value);

    // Step 4: Generate AI analysis
    const analysis = await generatePortfolioAnalysis(holdingsData, sectorBreakdown, totalValue);

    const result = {
      holdings: holdingsData,
      sectorBreakdown: sectorBreakdown,
      totalValue: totalValue,
      sectorConcentration: analysis.sectorConcentration,
      thematicAnalysis: analysis.thematicAnalysis,
      timestamp: new Date().toISOString()
    };

    console.log('Portfolio analysis completed successfully');

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-portfolio function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to analyze portfolio'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// AI-powered natural language parsing
async function parseHoldingsWithAI(input: string): Promise<{ ticker: string; shares: number }[]> {
  const parsePrompt = `Parse this natural language portfolio input into ticker symbols and share counts. Return ONLY a JSON array.

Input: "${input}"

Convert company names to their stock ticker symbols. Common examples:
- Apple/Apple Inc → AAPL
- Microsoft → MSFT  
- Google/Alphabet → GOOGL
- Nvidia → NVDA
- Tesla → TSLA
- Amazon → AMZN
- Meta/Facebook → META
- Netflix → NFLX
- Coca Cola/Coke → KO
- Disney → DIS
- Berkshire Hathaway → BRK.B
- JPMorgan/JP Morgan → JPM

Return format: [{"ticker": "AAPL", "shares": 10}, {"ticker": "MSFT", "shares": 25}]

IMPORTANT: For Berkshire Hathaway, use "BRK.B" (the more liquid B shares).
If you can't identify a company, skip it. Only return valid tickers.`;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek/deepseek-chat-v3-0324:free',
        messages: [{ role: 'user', content: parsePrompt }],
        temperature: 0.1,
        max_tokens: 300
      }),
    });

    if (!response.ok) {
      throw new Error(`Parse AI API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.choices?.[0]?.message?.content) {
      throw new Error('Invalid parse AI response structure');
    }

    const content = data.choices[0].message.content;
    console.log('AI parse response:', content);

    // Extract JSON from response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('No JSON array found in AI response');
    }

    const parsedHoldings = JSON.parse(jsonMatch[0]);
    
    // Validate the parsed data
    const validHoldings = parsedHoldings.filter((holding: any) => {
      const isValid = holding.ticker && 
        typeof holding.shares === 'number' && 
        holding.shares > 0 &&
        holding.ticker.match(/^[A-Z]{1,5}(\.[A-Z])?$/); // Allow BRK.B format
      
      if (!isValid) {
        console.log(`Filtered out invalid holding:`, holding);
      }
      return isValid;
    });

    console.log(`Parsed ${validHoldings.length} valid holdings from AI response`);
    return validHoldings;

  } catch (error) {
    console.error('Error parsing holdings with AI:', error);
    // Fallback to basic pattern matching if AI fails
    return fallbackParsing(input);
  }
}

// Fallback parsing for when AI fails
function fallbackParsing(input: string): { ticker: string; shares: number }[] {
  const holdings: { ticker: string; shares: number }[] = [];
  const entries = input.split(/[,;]|\sand\s/).map(entry => entry.trim());
  
  for (const entry of entries) {
    const match = entry.match(/([A-Z]{1,5})\s*[:\-\s]\s*(\d+(?:\.\d+)?)/i);
    if (match) {
      const ticker = match[1].toUpperCase();
      const shares = parseFloat(match[2]);
      if (shares > 0) {
        holdings.push({ ticker, shares });
      }
    }
  }
  
  return holdings;
}

// Generate portfolio analysis with AI
async function generatePortfolioAnalysis(
  holdingsData: HoldingData[], 
  sectorBreakdown: any[], 
  totalValue: number
): Promise<{ sectorConcentration: string; thematicAnalysis: string }> {
  
  const topHoldings = holdingsData.slice(0, 5);
  const holdingsSummary = topHoldings.map(h => 
    `${h.ticker}: ${h.shares} shares, $${h.value.toFixed(0)} (${h.sector})`
  ).join('; ');

  const topSectors = sectorBreakdown.slice(0, 3);
  const sectorSummary = topSectors.map(s => 
    `${s.sector}: ${s.percentage.toFixed(1)}%`
  ).join('; ');

  const analysisPrompt = `Analyze this portfolio: Total: $${totalValue.toFixed(0)}. Holdings: ${holdingsSummary}. Sectors: ${sectorSummary}.

IMPORTANT: Respond with valid JSON only. No markdown, no explanations.

{
  "sectorConcentration": "Brief risk analysis mentioning if any sector >40%",
  "thematicAnalysis": "Brief investment strategy summary in 1-2 sentences"
}`;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek/deepseek-chat-v3-0324:free',
        messages: [{ role: 'user', content: analysisPrompt }],
        temperature: 0.1,
        max_tokens: 400,
        top_p: 0.9
      }),
    });

    if (!response.ok) {
      throw new Error(`Analysis AI API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.choices?.[0]?.message?.content) {
      throw new Error('Invalid analysis AI response structure');
    }

    const content = data.choices[0].message.content;
    console.log('Analysis AI raw response:', content);
    
    // Parse AI response - try multiple extraction methods
    let jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      // Try finding JSON between backticks
      jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
      if (jsonMatch) jsonMatch = [jsonMatch[1]];
    }
    
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      console.log('Successfully parsed analysis:', parsed);
      return parsed;
    }
    
    throw new Error('No JSON found in analysis response');

  } catch (error) {
    console.error('Error generating analysis:', error);
    return {
      sectorConcentration: "Unable to analyze sector concentration. Please review your portfolio allocation manually.",
      thematicAnalysis: "Unable to generate thematic analysis. Your portfolio appears to reflect a diversified investment approach."
    };
  }
}