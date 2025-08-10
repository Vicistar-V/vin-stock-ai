import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log(`📊 financial-metrics started - ${req.method} ${req.url}`);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ticker } = await req.json();
    if (!ticker) {
      return new Response(JSON.stringify({ error: 'Missing ticker' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('FINNHUB_API_KEY');
    if (!apiKey) {
      throw new Error('FINNHUB_API_KEY not configured');
    }

    // Fetch basic financial metrics
    const url = `https://finnhub.io/api/v1/stock/metric?symbol=${encodeURIComponent(ticker)}&metric=all&token=${apiKey}`;
    console.log('➡️ Fetching Finnhub metrics:', url);
    const r = await fetch(url);
    if (!r.ok) {
      const t = await r.text();
      throw new Error(`Finnhub error ${r.status}: ${t}`);
    }
    const data = await r.json();
    const metric = data?.metric || {};

    // Helper to format numbers
    const fmt = (val: unknown, opts: { type?: 'number' | 'percent' | 'currency'; digits?: number } = {}) => {
      const { type = 'number', digits = 1 } = opts;
      const n = typeof val === 'number' ? val : Number(val);
      if (!isFinite(n)) return null;
      if (type === 'percent') return `${(n * 100).toFixed(digits)}%`;
      if (type === 'currency') return `$${n.toFixed(digits)}`;
      return n.toFixed(digits);
    };

    const metrics = [] as Array<{ key: string; label: string; value: string; raw: number }>;

    // P/E Ratio (prefer basic excl. extraordinary TTM, fallback to TTM)
    const pe = metric.peBasicExclExtraTTM ?? metric.peTTM;
    if (isFinite(Number(pe))) metrics.push({ key: 'pe', label: 'P/E Ratio', value: fmt(pe, { digits: 1 })!, raw: Number(pe) });

    // EPS TTM
    const eps = metric.epsTTM;
    if (isFinite(Number(eps))) metrics.push({ key: 'epsTTM', label: 'EPS (TTM)', value: fmt(eps, { type: 'currency', digits: 2 })!, raw: Number(eps) });

    // ROE TTM
    const roe = metric.roeTTM;
    if (isFinite(Number(roe))) metrics.push({ key: 'roeTTM', label: 'ROE (TTM)', value: fmt(roe, { type: 'percent', digits: 1 })!, raw: Number(roe) });

    // Debt to Equity (Quarterly)
    const dte = metric.totalDebtToEquityQuarterly ?? metric.debtToEquityQuarterly;
    if (isFinite(Number(dte))) metrics.push({ key: 'debtToEquity', label: 'Debt to Equity', value: fmt(dte, { digits: 2 })!, raw: Number(dte) });

    // Net Profit Margin TTM
    const npm = metric.netProfitMarginTTM;
    if (isFinite(Number(npm))) metrics.push({ key: 'netProfitMarginTTM', label: 'Net Profit Margin (TTM)', value: fmt(npm, { type: 'percent', digits: 1 })!, raw: Number(npm) });

    // Revenue Growth YoY (TTM)
    const revYoY = metric.revenueGrowthTTMYoy ?? metric.revenueGrowthTTMYoY;
    if (isFinite(Number(revYoY))) metrics.push({ key: 'revenueGrowthTTMYoY', label: 'Revenue Growth YoY (TTM)', value: fmt(revYoY, { type: 'percent', digits: 1 })!, raw: Number(revYoY) });

    return new Response(JSON.stringify({ success: true, ticker, metrics }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('❌ financial-metrics error:', err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});