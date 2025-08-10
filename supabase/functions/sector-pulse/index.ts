import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sector, tickers } = await req.json();
    console.log(`🏭 Starting sector analysis for: ${sector}`);
    console.log(`📊 Analyzing tickers: ${tickers.join(', ')}`);

    const finnhubApiKey = Deno.env.get('FINNHUB_API_KEY');
    const openrouterApiKey = Deno.env.get('OPENROUTER_API_KEY');

    if (!finnhubApiKey || !openrouterApiKey) {
      throw new Error('Missing required API keys');
    }

    // Gather news for all tickers in the sector
    const allNews: Array<{ticker: string, headline: string, summary: string}> = [];
    
    console.log('📰 Gathering news for sector analysis...');
    
    for (const ticker of tickers) {
      try {
        // Fetch recent news for each ticker
        const newsResponse = await fetch(
          `https://finnhub.io/api/v1/company-news?symbol=${ticker}&from=${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}&to=${new Date().toISOString().split('T')[0]}&token=${finnhubApiKey}`
        );
        
        if (newsResponse.ok) {
          const newsData = await newsResponse.json();
          
          // Take the top 3 most recent news items per ticker
          const recentNews = newsData.slice(0, 3);
          for (const news of recentNews) {
            allNews.push({
              ticker,
              headline: news.headline,
              summary: news.summary || news.headline
            });
          }
        }
        
        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.log(`⚠️ Failed to fetch news for ${ticker}:`, error);
        // Continue with other tickers
      }
    }

    console.log(`📄 Collected ${allNews.length} news items for analysis`);

    // If we don't have enough news, create a fallback analysis
    if (allNews.length === 0) {
      console.log('⚠️ No news collected, generating fallback analysis');
      
      const fallbackAnalysis = {
        sector,
        mood_and_trends: `The ${sector} sector continues to navigate current market conditions with mixed signals. While some uncertainty persists around interest rates and global economic conditions, the sector maintains its fundamental strengths and long-term growth potential.`,
        major_players: `Key players in the ${sector} sector including ${tickers.slice(0, 3).join(', ')} are focusing on operational efficiency and strategic positioning. Major companies continue to invest in innovation while managing costs and maintaining competitive advantages.`,
        emerging_stories: [
          `Ongoing market volatility continues to impact ${sector} valuations`,
          `Companies are focusing on cost optimization and operational efficiency`,
          `Long-term growth strategies remain a priority for sector leaders`,
          `Regulatory environment continues to evolve for the industry`
        ],
        timestamp: new Date().toISOString()
      };

      return new Response(JSON.stringify(fallbackAnalysis), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Prepare news context for AI analysis
    const newsContext = allNews.map(news => 
      `[${news.ticker}] ${news.headline}\n${news.summary}`
    ).join('\n\n');

    console.log('🧠 Generating AI sector analysis...');

    // Generate comprehensive sector analysis using AI
    const aiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openrouterApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek/deepseek-r1-0528:free',
        messages: [
          {
            role: 'system',
            content: `You are a senior financial analyst writing sector briefings for institutional investors. Analyze news from multiple companies to understand the overall industry landscape, trends, and outlook.`
          },
          {
            role: 'user',
            content: `Please analyze the current state of the ${sector} sector based on the following recent news headlines and summaries from key companies:

--- RECENT NEWS FROM ${sector.toUpperCase()} SECTOR ---
${newsContext}
--- END OF NEWS ---

Please provide a comprehensive sector analysis with exactly these three sections:

1. OVERALL MOOD & KEY TRENDS: Write a detailed paragraph (4-6 sentences) summarizing the big picture sentiment and major themes affecting the entire ${sector} industry right now.

2. MAJOR PLAYERS & RECENT MOVES: Write a detailed paragraph (4-6 sentences) highlighting what the most important companies are doing, their strategic moves, and how they're positioning themselves.

3. EMERGING STORIES: Provide exactly 4 bullet points of other notable developments, potential future catalysts, or industry-wide concerns that investors should watch.

Format your response as valid JSON:
{
  "mood_and_trends": "your detailed paragraph here",
  "major_players": "your detailed paragraph here", 
  "emerging_stories": ["story 1", "story 2", "story 3", "story 4"]
}`
          }
        ],
        temperature: 0.3,
        max_tokens: 1000
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices[0].message.content;

    console.log('🎯 Raw AI response received');

    // Parse the AI response
    let analysisResult;
    try {
      // Extract JSON from the response (in case it's wrapped in markdown)
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      const jsonContent = jsonMatch ? jsonMatch[0] : aiContent;
      
      const parsed = JSON.parse(jsonContent);
      
      analysisResult = {
        sector,
        mood_and_trends: parsed.mood_and_trends,
        major_players: parsed.major_players,
        emerging_stories: Array.isArray(parsed.emerging_stories) ? parsed.emerging_stories : [],
        timestamp: new Date().toISOString()
      };

    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      console.log('Raw AI content:', aiContent);
      
      // Fallback analysis if parsing fails
      analysisResult = {
        sector,
        mood_and_trends: `The ${sector} sector is experiencing mixed signals in the current market environment. Recent developments across major players suggest a period of adjustment as companies navigate evolving market conditions while maintaining focus on core business strategies.`,
        major_players: `Leading companies in the ${sector} space including ${tickers.slice(0, 3).join(', ')} are implementing strategic initiatives to strengthen their market positions. These industry leaders continue to drive innovation while adapting to changing market dynamics.`,
        emerging_stories: [
          `Market volatility continues to influence ${sector} sector valuations`,
          'Companies are prioritizing operational efficiency and cost management',
          'Strategic partnerships and collaborations are becoming more common',
          'Long-term growth investments remain a focus despite near-term uncertainties'
        ],
        timestamp: new Date().toISOString()
      };
    }

    console.log(`✅ Sector analysis completed for ${sector}`);

    return new Response(JSON.stringify(analysisResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in sector-pulse function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to generate sector analysis',
        details: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});