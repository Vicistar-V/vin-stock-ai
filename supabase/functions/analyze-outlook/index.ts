import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

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
    console.log('🔮 Future Outlook Analyzer started');
    
    const { ticker, analysisType } = await req.json();
    
    if (!ticker || !analysisType) {
      throw new Error('Missing required parameters: ticker and analysisType');
    }

    console.log(`📊 Analyzing ${analysisType} for ${ticker}`);

    // Get API keys
    const openRouterKey = Deno.env.get('OPENROUTER_API_KEY');
    const finnhubKey = Deno.env.get('FINNHUB_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!openRouterKey || !finnhubKey || !supabaseUrl || !supabaseKey) {
      throw new Error('Missing required API keys');
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Get company profile from Finnhub
    console.log('🏢 Fetching company profile...');
    let companyProfile = null;
    try {
      const profileResponse = await fetch(
        `https://finnhub.io/api/v1/stock/profile2?symbol=${ticker}&token=${finnhubKey}`
      );
      if (profileResponse.ok) {
        companyProfile = await profileResponse.json();
      }
    } catch (error) {
      console.log('⚠️ Company profile fetch failed:', error.message);
    }

    // 2. Get latest news from database
    console.log('📰 Fetching latest news...');
    const { data: newsData } = await supabase
      .from('news')
      .select('headline, summary')
      .eq('ticker', ticker)
      .order('published_at', { ascending: false })
      .limit(10);

    // 3. Get SEC risk summary (try to get from recent SEC analysis if available)
    console.log('📋 Gathering SEC context...');
    let secContext = '';
    
    // Build context for the AI prompt
    const companyDescription = companyProfile ? 
      `${companyProfile.name} - ${companyProfile.finnhubIndustry || 'Technology'}. ${companyProfile.weburl || ''}` :
      `${ticker} stock`;

    const recentNews = newsData && newsData.length > 0 ? 
      newsData.map(article => `• ${article.headline}${article.summary ? ': ' + article.summary.substring(0, 150) + '...' : ''}`).join('\n') :
      'No recent news available';

    // Determine prompt based on analysis type
    const isRisks = analysisType.toLowerCase() === 'risks';
    const focusArea = isRisks ? 'potential future risks and challenges' : 'potential future opportunities and growth drivers';
    const perspective = isRisks ? 'threats, challenges, competitive pressures, regulatory risks, and market headwinds' : 'growth opportunities, market expansion, technological advantages, and positive catalysts';

    const prompt = `You are a strategic foresight expert specializing in financial markets and investment analysis. Your job is to identify ${focusArea} for the following company based on the provided context.

COMPANY: ${ticker}
DESCRIPTION: ${companyDescription}

RECENT MARKET CONTEXT:
${recentNews}

Generate exactly 4 ${isRisks ? 'potential future risks' : 'potential future opportunities'} that could significantly impact this company over the next 1-3 years. Focus on ${perspective}.

CRITICAL FORMATTING REQUIREMENTS:
- Start IMMEDIATELY with the first bullet point
- NO introductory text, headers, or conclusions
- Each bullet point must start with "• **Title**: Description"
- Be specific, actionable, and forward-looking
- Each point should be 2-3 sentences maximum

Example format:
• **Regulatory Challenges**: New AI regulations could limit AWS growth in Europe...
• **Competition Intensification**: Microsoft's AI partnerships threaten cloud market share...`;

    console.log('🤖 Sending to AI for analysis...');
    
    // Call OpenRouter API
    const aiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': supabaseUrl,
        'X-Title': 'Vin Stock Future Outlook Analyzer'
      },
      body: JSON.stringify({
        model: 'deepseek/deepseek-chat-v3-0324:free',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('❌ OpenRouter API error:', aiResponse.status, errorText);
      throw new Error(`AI analysis failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    let analysis = aiData.choices[0]?.message?.content;

    if (!analysis) {
      throw new Error('No analysis content received from AI');
    }

    // Clean up the response - remove any intro text
    analysis = analysis
      .replace(/^.*?here\s+are?\s+\d+-?\d*.*?:/i, '') // Remove "Here are 3-5..." type intros
      .replace(/^.*?following\s+are?\s+the.*?:/i, '') // Remove "The following are..." type intros  
      .replace(/^.*?below\s+are?\s+.*?:/i, '') // Remove "Below are..." type intros
      .replace(/^[^•]*(?=•)/, '') // Remove any text before the first bullet point
      .trim();

    console.log('✅ Analysis completed successfully');

    return new Response(JSON.stringify({
      success: true,
      analysis: analysis,
      analysisType: analysisType,
      ticker: ticker,
      companyName: companyProfile?.name || ticker,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error in analyze-outlook function:', error);
    
    return new Response(JSON.stringify({
      error: error.message || 'Analysis failed',
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});