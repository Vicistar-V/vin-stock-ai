import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openRouterApiKey = Deno.env.get('OPENROUTER_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NewsArticle {
  headline: string;
  summary?: string;
  url?: string;
  source?: string;
}

interface AnalysisRequest {
  ticker: string;
  news_articles: NewsArticle[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ticker, news_articles }: AnalysisRequest = await req.json();
    
    console.log(`Analyzing news for ${ticker}, ${news_articles.length} articles`);

    if (!news_articles || news_articles.length === 0) {
      return new Response(JSON.stringify({ 
        error: 'No news articles provided for analysis' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build the AI prompt with news articles
    const newsText = news_articles.map((article, index) => 
      `${index + 1}. "${article.headline}"${article.summary ? ` - ${article.summary}` : ''}`
    ).join('\n');

    const prompt = `Analyze ${ticker} news. Return only JSON:

News: ${newsText}

Format:
{
  "summary": "Brief impact summary",
  "sentiment_score": [1-10],
  "sentiment_justification": "Short reason",
  "key_positive_highlight": "Best news",
  "key_negative_highlight": "Main concern",
  "market_impact": "Price impact"
}`;

    console.log('Sending request to OpenRouter...');

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://vinstock.ai',
        'X-Title': 'Vin Stock News Analyzer'
      },
      body: JSON.stringify({
        model: 'deepseek/deepseek-chat-v3-0324:free',
        messages: [
          { 
            role: 'user', 
            content: prompt 
          }
        ],
        temperature: 0.1,
        max_tokens: 400
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter API error:', response.status, errorText);
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('OpenRouter response received');

    const analysisText = data.choices[0].message.content;
    
    // Try to parse the JSON response from the AI
    let analysis;
    try {
      // Clean unwanted patterns first
      let cleanedText = analysisText
        .replace(/^Here('s| is)\s.*?:/i, '')     // Remove "Here's" or "Here is" at start
        .replace(/^Based on.*?:/i, '')          // Remove "Based on" intro
        .replace(/^This analysis.*?:/i, '')     // Remove "This analysis" intro
        .trim();
        
      // Extract JSON from the response (remove any markdown formatting)
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback if no JSON structure found
        analysis = {
          summary: cleanedText,
          sentiment_score: 5,
          sentiment_justification: "Analysis provided",
          key_positive_highlight: "See summary for details",
          key_negative_highlight: "See summary for details",
          market_impact: "Impact unclear from available data"
        };
      }
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      // Fallback analysis
      analysis = {
        summary: analysisText.substring(0, 300) + "...",
        sentiment_score: 5,
        sentiment_justification: "Neutral - analysis format issue",
        key_positive_highlight: "Multiple developments noted",
        key_negative_highlight: "Some concerns mentioned",
        market_impact: "Mixed signals from recent news"
      };
    }

    // Add metadata
    const result = {
      ...analysis,
      ticker,
      articles_analyzed: news_articles.length,
      analysis_timestamp: new Date().toISOString(),
      analyst: "Vin Stock AI"
    };

    console.log('Analysis completed successfully');

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-news function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      ticker: 'unknown',
      sentiment_score: 5,
      summary: 'Unable to analyze news at this time. Please try again.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});