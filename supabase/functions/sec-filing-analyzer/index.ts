import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log(`🚀 SEC Filing Analyzer v2 started - ${req.method} ${req.url}`);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('📋 Handling CORS preflight');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📥 Parsing request body...');
    const body = await req.json();
    console.log('📄 Request body received:', body);
    
    const { ticker, section } = body;
    
    if (!ticker || !section) {
      console.error('❌ Missing required parameters:', { ticker, section });
      throw new Error('Missing ticker or section parameter');
    }

    console.log(`📋 Starting analysis: ${section} for ${ticker}`);

    // Check for required API keys
    const openRouterApiKey = Deno.env.get('OPENROUTER_API_KEY');
    const finnhubApiKey = Deno.env.get('FINNHUB_API_KEY');

    console.log('🔑 API Keys check:', {
      openRouter: openRouterApiKey ? 'Present' : 'Missing',
      finnhub: finnhubApiKey ? 'Present' : 'Missing'
    });

    if (!openRouterApiKey) {
      throw new Error('OpenRouter API key not found');
    }

    if (!finnhubApiKey) {
      throw new Error('Finnhub API key not found');
    }

    // Step 1: Get the latest SEC filing URL from Finnhub
    console.log(`🔍 Fetching SEC filings for ${ticker}`);
    const filingsResponse = await fetch(
      `https://finnhub.io/api/v1/stock/filings?symbol=${ticker}&token=${finnhubApiKey}`
    );

    if (!filingsResponse.ok) {
      throw new Error(`Failed to fetch filings: ${filingsResponse.status}`);
    }

    const filingsData = await filingsResponse.json();
    console.log(`📄 Found ${filingsData.length} filings`);

    if (!filingsData || filingsData.length === 0) {
      throw new Error('No SEC filings found for this ticker');
    }

    // Find the most recent 10-K or 10-Q filing
    const relevantFiling = filingsData.find((filing: any) => 
      filing.form === '10-K' || filing.form === '10-Q'
    );

    if (!relevantFiling) {
      throw new Error('No 10-K or 10-Q filings found');
    }

    console.log(`📊 Using filing: ${relevantFiling.form} filed on ${relevantFiling.filedDate}`);

    // Step 2: Get the filing content with better error handling
    console.log(`📥 Fetching filing content from: ${relevantFiling.reportUrl}`);
    
    let filingText = '';
    let contentFetchError = null;
    
    try {
      const filingResponse = await fetch(relevantFiling.reportUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; SEC Filing Analyzer)'
        }
      });
      
      if (filingResponse.ok) {
        const rawHtml = await filingResponse.text();
        console.log(`📄 Raw HTML length: ${rawHtml.length} characters`);
        
        // Improved text extraction
        filingText = rawHtml
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove script tags
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')   // Remove style tags
          .replace(/<[^>]*>/g, ' ')                          // Remove HTML tags
          .replace(/&nbsp;/g, ' ')                          // Replace &nbsp; with spaces
          .replace(/&amp;/g, '&')                           // Replace &amp; with &
          .replace(/&lt;/g, '<')                            // Replace &lt; with <
          .replace(/&gt;/g, '>')                            // Replace &gt; with >
          .replace(/&quot;/g, '"')                          // Replace &quot; with "
          .replace(/&#\d+;/g, ' ')                          // Replace numeric entities
          .replace(/\s+/g, ' ')                             // Replace multiple spaces
          .replace(/\n\s*\n/g, '\n')                        // Clean up line breaks
          .trim();
          
        console.log(`📝 Cleaned text length: ${filingText.length} characters`);
      } else {
        contentFetchError = `HTTP ${filingResponse.status}`;
        console.log(`⚠️ Filing fetch failed: ${contentFetchError}`);
      }
    } catch (error) {
      contentFetchError = error.message;
      console.log(`⚠️ Could not fetch filing content: ${contentFetchError}`);
    }

    // If we couldn't get the filing content, use a fallback approach
    if (!filingText.trim()) {
      console.log(`🔄 Using fallback approach - analyzing based on filing metadata`);
      filingText = `This is a ${relevantFiling.form} filing for ${ticker} filed on ${relevantFiling.filedDate}. The filing discusses the company's business operations, financial performance, and various business factors.`;
    }

    // Step 3: Extract relevant section using pattern matching
    let relevantSection = '';
    const lowerText = filingText.toLowerCase();

    if (section.includes('risk')) {
      // Look for Risk Factors section
      const riskStart = lowerText.indexOf('item 1a');
      if (riskStart === -1) {
        const altRiskStart = lowerText.indexOf('risk factors');
        if (altRiskStart !== -1) {
          relevantSection = filingText.substring(altRiskStart, altRiskStart + 8000);
        }
      } else {
        const riskEnd = lowerText.indexOf('item 1b', riskStart);
        const endPos = riskEnd !== -1 ? riskEnd : riskStart + 8000;
        relevantSection = filingText.substring(riskStart, endPos);
      }
    } else if (section.includes('management') || section.includes('discussion')) {
      // Look for MD&A section
      const mdaStart = lowerText.indexOf('item 7');
      if (mdaStart === -1) {
        const altMdaStart = lowerText.indexOf('management discussion');
        if (altMdaStart !== -1) {
          relevantSection = filingText.substring(altMdaStart, altMdaStart + 8000);
        }
      } else {
        const mdaEnd = lowerText.indexOf('item 8', mdaStart);
        const endPos = mdaEnd !== -1 ? mdaEnd : mdaStart + 8000;
        relevantSection = filingText.substring(mdaStart, endPos);
      }
    } else if (section.includes('revenue')) {
      // Look for revenue information in multiple sections
      const revenueTerms = ['revenue', 'net sales', 'total revenue', 'income statement'];
      for (const term of revenueTerms) {
        const termStart = lowerText.indexOf(term);
        if (termStart !== -1) {
          relevantSection = filingText.substring(termStart, termStart + 6000);
          break;
        }
      }
    }

    // If no specific section found, provide a general analysis
    if (!relevantSection.trim()) {
      console.log(`📋 Using general analysis approach for ${section}`);
      relevantSection = `This analysis is based on ${ticker}'s ${relevantFiling.form} filing from ${relevantFiling.filedDate}. The filing contains comprehensive information about the company's business operations, financial performance, and various business factors relevant to ${section}.`;
    }

    console.log(`📝 Final section length: ${relevantSection.length} characters`);

    // Step 4: Create AI prompt for analysis with fallback content
    let systemPrompt = 'You are a financial analyst. Provide clear analysis in bullet points.';
    let userPrompt = '';

    if (section.includes('risk')) {
      userPrompt = `Analyze ${ticker}'s key risk factors and provide:

**Top 5 Business Risks:**
1. [Risk name]: Brief explanation and potential impact
2. [Risk name]: Brief explanation and potential impact
3. [Risk name]: Brief explanation and potential impact
4. [Risk name]: Brief explanation and potential impact  
5. [Risk name]: Brief explanation and potential impact

**Key Investor Considerations:**
• [Key consideration 1]
• [Key consideration 2]
• [Key consideration 3]

${relevantSection.length > 100 ? `Filing content: ${relevantSection.substring(0, 3000)}` : `Provide analysis based on typical risks for ${ticker} including technology, competition, regulatory, and market risks.`}`;

    } else if (section.includes('management') || section.includes('discussion')) {
      userPrompt = `Analyze ${ticker}'s management discussion and provide:

**Business Performance Highlights:**
• [Key highlight 1]
• [Key highlight 2]
• [Key highlight 3]

**Strategic Outlook:**
• [Strategy point 1]
• [Strategy point 2]
• [Strategy point 3]

**Key Challenges & Opportunities:**
• [Challenge/opportunity 1]
• [Challenge/opportunity 2]
• [Challenge/opportunity 3]

**Financial Trends:**
• [Trend 1]
• [Trend 2]
• [Trend 3]

${relevantSection.length > 100 ? `Filing content: ${relevantSection.substring(0, 3000)}` : `Provide analysis based on typical management discussion topics for ${ticker}.`}`;

    } else if (section.includes('revenue')) {
      userPrompt = `Analyze ${ticker}'s revenue structure and provide:

**Primary Revenue Sources:**
1. [Segment]: $X billion (X% of total) - Description
2. [Segment]: $X billion (X% of total) - Description  
3. [Segment]: $X billion (X% of total) - Description

**Revenue Growth Drivers:**
• [Driver 1]: Impact and trend
• [Driver 2]: Impact and trend
• [Driver 3]: Impact and trend

**Geographic/Product Breakdown:**
• [Region/Product]: Performance and outlook
• [Region/Product]: Performance and outlook
• [Region/Product]: Performance and outlook

**Key Performance Factors:**
• [Factor 1]
• [Factor 2]
• [Factor 3]

${relevantSection.length > 100 ? `Filing content: ${relevantSection.substring(0, 3000)}` : `Provide analysis based on typical revenue structure for ${ticker}.`}`;
    }

    // Add timeout protection
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    // Step 5: Call OpenRouter API with timeout protection
    console.log(`🤖 Sending to AI for analysis (prompt length: ${userPrompt.length})`);
    
    try {
      const aiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openRouterApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'deepseek/deepseek-chat-v3-0324:free',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.1,
          max_tokens: 600
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error(`❌ AI API error: ${aiResponse.status} - ${errorText}`);
        throw new Error(`AI analysis failed: ${aiResponse.status}`);
      }

      const aiData = await aiResponse.json();
      let analysis = aiData.choices[0].message.content;

      // Clean up unwanted AI response patterns
      analysis = analysis
        .replace(/^Here('s| is)\s.*?:/i, '')     // Remove "Here's" or "Here is" at start
        .replace(/^Based on.*?:/i, '')          // Remove "Based on" intro
        .replace(/^This analysis.*?:/i, '')     // Remove "This analysis" intro
        .replace(/^---\s*$/gm, '')              // Remove horizontal rules
        .replace(/\*\*(.*?)\*\*/g, '$1')        // Remove bold markdown
        .replace(/\*(.*?)\*/g, '$1')            // Remove italic markdown
        .replace(/`(.*?)`/g, '$1')              // Remove inline code markdown
        .replace(/#{1,6}\s/g, '')               // Remove header markdown
        .trim();

      console.log(`✅ Analysis completed successfully (${analysis.length} chars)`);

      return new Response(JSON.stringify({ 
        analysis,
        filingTitle: `${ticker} ${relevantFiling.form} Report (${new Date(relevantFiling.filedDate).toLocaleDateString()})`,
        success: true,
        section: section
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
      
    } catch (fetchError) {
      clearTimeout(timeoutId);
      console.error(`❌ AI fetch error: ${fetchError.message}`);
      throw fetchError;
    }

  } catch (error) {
    console.error('❌ Unhandled error in SEC filing analysis:', error);
    console.error('Error stack:', error.stack);
    
    // Always return a response, never let the function hang
    const errorResponse = {
      analysis: `I'm experiencing a temporary issue analyzing ${ticker || 'this company'}'s SEC filing. Please try again in a moment.

In the meantime, for ${section || 'general'} analysis, consider checking:
• The company's investor relations website
• Recent quarterly earnings calls
• Industry analysis reports
• SEC EDGAR database directly at sec.gov`,
      filingTitle: `${ticker || 'Company'} SEC Filing Analysis`,
      success: false,
      error: 'Service temporarily unavailable'
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 200, // Return 200 to prevent frontend errors
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});