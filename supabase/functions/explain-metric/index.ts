import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log(`🤖 explain-metric started - ${req.method} ${req.url}`);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ticker, metricName, metricValue } = await req.json();
    if (!ticker || !metricName || metricValue === undefined) {
      return new Response(JSON.stringify({ error: 'Missing ticker, metricName, or metricValue' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const openRouterApiKey = Deno.env.get('OPENROUTER_API_KEY');
    if (!openRouterApiKey) {
      console.error('❌ OPENROUTER_API_KEY not configured');
      throw new Error('AI service not configured');
    }

    console.log(`📊 Explaining ${metricName}: ${metricValue} for ${ticker}`);

    const systemPrompt = "You are a friendly finance teacher. Explain this financial metric in only 1 simple sentences that a beginner can understand. Be encouraging and clear.";
    const userPrompt = `Explain what a ${metricName} of ${metricValue} means for ${ticker} stock. Keep it simple and friendly.`;

    console.log(`🤖 Making AI request with 30s timeout...`);
    
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      console.error(`⏰ Request timed out after 30 seconds`);
      controller.abort();
    }, 30000); // Increased to 30 seconds

    try {
      const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openRouterApiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://vinstock.ai',
          'X-Title': 'Stock Analysis Platform',
        },
        body: JSON.stringify({
          model: 'deepseek/deepseek-chat-v3-0324:free',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.1,
          max_tokens: 80,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);
      console.log(`✅ AI request completed with status: ${resp.status}`);

      if (!resp.ok) {
        const errorText = await resp.text();
        console.error(`❌ AI API error ${resp.status}: ${errorText}`);
        throw new Error(`AI service returned ${resp.status}: ${errorText}`);
      }

      const json = await resp.json();
      console.log(`📝 Raw AI response:`, JSON.stringify(json, null, 2));
      
      let explanation = json?.choices?.[0]?.message?.content || 'Unable to generate explanation at this time.';

      // Clean up the explanation
      explanation = explanation
        .replace(/^Here( is|'s)\b.*?:\s*/i, '')
        .replace(/^In short[:,]?\s*/i, '')
        .replace(/^Explanation:\s*/i, '')
        .trim();

      if (!explanation || explanation.length < 10) {
        explanation = `A ${metricName} of ${metricValue} is a key financial indicator for ${ticker}. This metric helps investors understand the company's performance.`;
      }

      console.log(`✅ Final explanation: ${explanation}`);

      return new Response(JSON.stringify({ 
        success: true, 
        ticker, 
        metricName, 
        metricValue, 
        explanation 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (fetchError) {
      clearTimeout(timeout);
      
      if (fetchError.name === 'AbortError') {
        console.error('❌ Request was aborted (timeout)');
        throw new Error('Request timed out - AI service is taking too long to respond');
      } else {
        console.error('❌ Network or AI service error:', fetchError);
        throw fetchError;
      }
    }

  } catch (err) {
    console.error('❌ explain-metric error:', err);
    
    // Provide a fallback explanation
    const fallbackExplanation = `A ${req.body?.metricName || 'financial metric'} helps investors evaluate company performance. This specific value provides insight into the stock's fundamentals.`;
    
    return new Response(JSON.stringify({ 
      success: true, 
      ticker: req.body?.ticker || '', 
      metricName: req.body?.metricName || '', 
      metricValue: req.body?.metricValue || '', 
      explanation: fallbackExplanation,
      note: 'AI explanation service temporarily unavailable - showing fallback explanation'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});