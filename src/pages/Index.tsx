import { useState, useEffect } from "react";
import { StockSearch } from "@/components/StockSearch";
import { StockCard } from "@/components/StockCard";
import { MarketMovers } from "@/components/MarketMovers";
import { PopularStocks } from "@/components/PopularStocks";
import TradingViewWidget from "@/components/TradingViewWidget";
import SEO from "@/components/SEO";
import Layout from "@/components/Layout";

const Index = () => {
  const [stockData, setStockData] = useState(null);
  const [error, setError] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const handleSearchResult = (data: any) => {
    setStockData(data);
    setError("");
  };

  const handleSearchError = (errorMessage: string) => {
    setError(errorMessage);
    setStockData(null);
  };

  const handleCloseCard = () => {
    setStockData(null);
    setError("");
  };

  const triggerQuickSearch = async (query: string) => {
    setIsSearching(true);
    setError("");
    setStockData(null);
    
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stock-search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ query: query.trim() })
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.error || 'Failed to search. Please try again.';
        handleSearchError(errorMessage);
        return;
      }

      handleSearchResult(data);
    } catch (error) {
      console.error('Quick search error:', error);
      handleSearchError('An error occurred while searching. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const triggerDirectTickerSearch = async (ticker: string) => {
    setIsSearching(true);
    setError("");
    setStockData(null);
    
    try {
      // Direct ticker search with query parameter
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stock-detail?ticker=${ticker}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.error || 'Failed to fetch stock data. Please try again.';
        handleSearchError(errorMessage);
        return;
      }

      // Transform the data to match the expected format
      const transformedData = {
        ticker: data.ticker,
        currentPrice: data.currentPrice,
        previousClose: data.previousClose,
        dayHigh: data.high,
        dayLow: data.low,
        openPrice: data.open,
        priceChange: data.priceChange,
        priceChangePercent: data.changePercent,
        timestamp: Math.floor(Date.now() / 1000),
        company: {
          name: data.name,
          logo: data.logo,
          country: 'US',
          currency: 'USD',
          exchange: 'NASDAQ',
          marketCap: data.marketCap || 0,
          industry: 'Technology',
          website: `https://${data.name?.toLowerCase().replace(/\s+/g, '') || ticker.toLowerCase()}.com`
        }
      };

      handleSearchResult(transformedData);
    } catch (error) {
      console.error('Direct ticker search error:', error);
      handleSearchError('An error occurred while fetching stock data. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const target = e.target as HTMLElement | null;
        const tag = target?.tagName?.toLowerCase();
        const editable = (target as any)?.isContentEditable === true;
        if (tag !== 'input' && tag !== 'textarea' && !editable) {
          e.preventDefault();
          document.getElementById('global-stock-search')?.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <Layout>
      <SEO title="Vin Stock — AI-Powered Stock Market Intelligence" description="Smart investing decisions with AI-driven insights. Real-time prices, news, and analysis." canonical="/" />
      
      {/* Trading Terminal Interface */}
      <section className="container mx-auto px-4 py-6">
        <div className="max-w-6xl mx-auto">
          {/* Terminal Header */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
              <span className="text-xs font-mono text-primary/80 uppercase tracking-wider">Market Intelligence Terminal</span>
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Live Trading Dashboard</h1>
            <p className="text-sm text-muted-foreground">Real-time market data • AI-powered analysis • Professional trading tools</p>
          </div>

          {/* AI Search Terminal */}
          <div className="bg-black/60 backdrop-blur-sm border border-primary/20 rounded-xl p-6 mb-8 relative overflow-hidden">
            {/* Loading Overlay */}
            {isSearching && (
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-xl">
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    {/* Outer spinning ring */}
                    <div className="w-12 h-12 border-2 border-primary/20 rounded-full animate-spin border-t-primary"></div>
                    {/* Inner pulsing dot */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-3 h-3 bg-primary rounded-full animate-pulse"></div>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-1 h-1 rounded-full bg-primary animate-pulse"></div>
                      <span className="text-xs font-mono text-primary/80 uppercase tracking-wider">AI Processing</span>
                      <div className="w-1 h-1 rounded-full bg-primary animate-pulse"></div>
                    </div>
                    <p className="text-sm text-muted-foreground font-mono">Analyzing market data...</p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                <h2 className="text-lg font-semibold text-primary">AI Intelligence Search</h2>
                <div className="px-2 py-1 bg-primary/20 rounded text-xs font-mono text-primary/80">LIVE</div>
              </div>
              <div className="text-xs text-muted-foreground font-mono">
                {new Date().toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  timeZone: 'America/New_York'
                })} EST
              </div>
            </div>
            
            <StockSearch onResult={handleSearchResult} onError={handleSearchError} />
            
            <div className="mt-4 pt-4 border-t border-primary/20">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-primary/60 font-mono uppercase">Quick Actions:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button 
                  className="bg-primary/10 hover:bg-primary/20 border border-primary/30 px-3 py-1.5 rounded text-xs font-mono text-primary transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  onClick={() => triggerDirectTickerSearch("TSLA")}
                  disabled={isSearching}
                >
                  "Tesla"
                </button>
                <button 
                  className="bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 px-3 py-1.5 rounded text-xs font-mono text-emerald-400 transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  onClick={() => triggerDirectTickerSearch("AAPL")}
                  disabled={isSearching}
                >
                  "Apple"
                </button>
                <button 
                  className="bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 px-3 py-1.5 rounded text-xs font-mono text-blue-400 transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  onClick={() => triggerDirectTickerSearch("MSFT")}
                  disabled={isSearching}
                >
                  "Microsoft"
                </button>
                <button 
                  className="bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 px-3 py-1.5 rounded text-xs font-mono text-purple-400 transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  onClick={() => triggerDirectTickerSearch("GOOGL")}
                  disabled={isSearching}
                >
                  "Google"
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Search Results Terminal */}
      {(error || stockData) && (
        <section className="container mx-auto px-4 py-0">
          <div className="max-w-6xl mx-auto">
            {error && (
              <div className="mb-8">
                <div className="bg-red-500/10 border-l-4 border-red-500 rounded-r-xl p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                    <span className="text-xs font-mono text-red-400 uppercase">Error Alert</span>
                  </div>
                  <p className="text-red-400 font-medium text-lg mt-2">{error}</p>
                </div>
              </div>
            )}

            {stockData && (
              <StockCard data={stockData} open={!!stockData} onClose={handleCloseCard} />
            )}
          </div>
        </section>
      )}

      {/* Market Intelligence Dashboard */}
      <section className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Dashboard Header */}
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              <span className="bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent">
                Market Overview
              </span>
            </h2>
          </div>

          {/* Market Data Grid */}
          <div className="grid gap-8 lg:gap-12">
            {/* Trending Stocks Section */}
            <div className="bg-black/40 backdrop-blur-sm border border-primary/20 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                  <h3 className="text-xl font-semibold text-primary">Market Trending</h3>
                  <div className="px-2 py-1 bg-emerald-500/20 rounded text-xs font-mono text-emerald-400">HOT</div>
                </div>
                <div className="text-xs text-muted-foreground font-mono">REAL-TIME</div>
              </div>
              <PopularStocks />
            </div>

            {/* Market Movers Section */}
            <div className="bg-black/40 backdrop-blur-sm border border-primary/20 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div>
                  <h3 className="text-xl font-semibold text-primary">Active Movers</h3>
                  <div className="px-2 py-1 bg-blue-500/20 rounded text-xs font-mono text-blue-400">LIVE</div>
                </div>
                <div className="text-xs text-muted-foreground font-mono">UPDATED NOW</div>
              </div>
              <MarketMovers />
            </div>
          </div>
        </div>
      </section>

      {/* Terminal Footer */}
      <footer className="mt-16 border-t border-primary/20 bg-black/60 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-3">
              <div className="w-1 h-1 rounded-full bg-primary/60 animate-pulse"></div>
              <span className="text-xs font-mono text-primary/60 uppercase tracking-wider">Professional Trading Platform</span>
              <div className="w-1 h-1 rounded-full bg-primary/60 animate-pulse"></div>
            </div>
            <p className="text-sm text-muted-foreground font-mono">
              <span className="text-primary/80">AI-Powered Analytics</span> • 
              <span className="text-emerald-400/80"> Real-time Data</span> • 
              <span className="text-blue-400/80"> Professional Tools</span>
            </p>
          </div>
        </div>
      </footer>
    </Layout>
  );
};

export default Index;
