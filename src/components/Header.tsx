import { Link, NavLink } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BarChart3, Lightbulb, PieChart, Target, TrendingUp, TrendingDown, Maximize, Minimize } from "lucide-react";
import { useMarketDashboard } from "@/hooks/useMarketDashboard";
import { useState, useEffect } from "react";

const Header = () => {
  const { data: marketData, loading } = useMarketDashboard();
  const dashboardData = marketData as any;
  const marketStats = dashboardData?.market_stats;
  const topMovers = dashboardData?.popular_stocks?.slice(0, 8) || [];

  // Live flicker states
  const [flickerStates, setFlickerStates] = useState<Record<string, string>>({});
  const [liveNumbers, setLiveNumbers] = useState<Record<string, number>>({});
  
  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Initialize and update live data
  useEffect(() => {
    if (topMovers.length === 0) return;

    // Initialize live numbers
    const initialNumbers: Record<string, number> = {};
    topMovers.forEach((stock: any) => {
      initialNumbers[stock.ticker] = stock.price || Math.random() * 500 + 50;
    });
    setLiveNumbers(initialNumbers);

    // Random flicker and number updates
    const intervals: NodeJS.Timeout[] = [];
    
    topMovers.forEach((stock: any) => {
      // Random flicker timing for each stock (300-1500ms)
      const flickerInterval = setInterval(() => {
        const colors = [
          'text-primary', 'text-emerald-300', 'text-red-300', 'text-primary/80', 
          'text-primary/60', 'text-purple-300', 'text-orange-300', 'text-pink-300'
        ];
        setFlickerStates(prev => ({
          ...prev,
          [stock.ticker]: colors[Math.floor(Math.random() * colors.length)]
        }));
      }, Math.random() * 1200 + 300);

      // Random number updates (200-800ms)
      const numberInterval = setInterval(() => {
        setLiveNumbers(prev => {
          const basePrice = stock.price || 100;
          const variation = (Math.random() - 0.5) * basePrice * 0.02; // ±2% variation
          return {
            ...prev,
            [stock.ticker]: Math.max(0.01, basePrice + variation)
          };
        });
      }, Math.random() * 600 + 200);

      intervals.push(flickerInterval, numberInterval);
    });

    return () => intervals.forEach(clearInterval);
  }, [topMovers.length]);

  const navItems = [
    { to: "/sector-pulse", label: "Sector Pulse", icon: PieChart },
    { to: "/portfolio-analysis", label: "Portfolio", icon: Target },
    { to: "/ai-screener", label: "AI Screener", icon: Lightbulb, primary: true },
  ];

  const formatTime = () => {
    return new Date().toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      timeZone: 'America/New_York'
    });
  };

  // Fullscreen functionality
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <header className="border-b bg-black/95 backdrop-blur-sm ml-80">
      {/* Top Market Ticker Bar */}
      <div className="bg-black border-b border-primary/20">
        <div className="container mx-auto">
          <div className="h-8 px-4 text-xs overflow-hidden relative">
            {/* Single Endless Scrolling Row */}
            <div className="flex items-center gap-8 animate-[scroll_25s_linear_infinite] whitespace-nowrap">
              {/* Time and Market Stats */}
              <span className="text-primary/90 font-medium bg-primary/20 px-3 py-1 rounded animate-pulse">
                NY {formatTime()} EST
              </span>
              
              {!loading && marketStats && (
                <>
                  <div className="flex items-center gap-2 bg-emerald-500/20 px-3 py-1 rounded animate-pulse">
                    <TrendingUp className="h-3 w-3 text-emerald-400" />
                    <span className="text-emerald-300 font-medium">
                      GAINERS: {marketStats.gainers_count}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 bg-red-500/20 px-3 py-1 rounded animate-pulse">
                    <TrendingDown className="h-3 w-3 text-red-400" />
                    <span className="text-red-300 font-medium">
                      LOSERS: {marketStats.losers_count}
                    </span>
                  </div>
                  <span className="text-primary/80 bg-primary/20 px-3 py-1 rounded animate-pulse">
                    MARKET AVG: {marketStats.avg_change > 0 ? '+' : ''}{marketStats.avg_change}%
                  </span>
                </>
              )}

              {/* Stock Tickers */}
              {!loading && topMovers.map((stock: any) => (
                <Link 
                  key={`scroll1-${stock.ticker}`}
                  to={`/stock/${stock.ticker}`}
                  className="flex items-center gap-2 hover:bg-primary/20 px-3 py-1 rounded transition-all border border-primary/20 animate-pulse"
                >
                  <span className={`font-mono font-bold transition-colors duration-150 ${flickerStates[stock.ticker] || 'text-primary'}`}>
                    {stock.ticker}
                  </span>
                  <span className={`font-mono transition-colors duration-200 ${flickerStates[`${stock.ticker}-price`] || 'text-primary/80'}`}>
                    ${liveNumbers[stock.ticker]?.toFixed(2) || stock.price?.toFixed(2)}
                  </span>
                  <span className={`font-mono transition-colors duration-150 ${
                    Math.random() > 0.5 ? 'text-emerald-300' : 'text-red-300'
                  }`}>
                    {Math.random() > 0.5 ? '+' : '-'}{(Math.random() * 5).toFixed(2)}%
                  </span>
                </Link>
              ))}

              {/* Separator */}
              <div className="w-px h-4 bg-primary/30"></div>

              {/* Duplicate everything for seamless loop */}
              <span className="text-primary/90 font-medium bg-primary/20 px-3 py-1 rounded animate-pulse">
                NY {formatTime()} EST
              </span>
              
              {!loading && marketStats && (
                <>
                  <div className="flex items-center gap-2 bg-emerald-500/20 px-3 py-1 rounded animate-pulse">
                    <TrendingUp className="h-3 w-3 text-emerald-400" />
                    <span className="text-emerald-300 font-medium">
                      GAINERS: {marketStats.gainers_count}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 bg-red-500/20 px-3 py-1 rounded animate-pulse">
                    <TrendingDown className="h-3 w-3 text-red-400" />
                    <span className="text-red-300 font-medium">
                      LOSERS: {marketStats.losers_count}
                    </span>
                  </div>
                  <span className="text-primary/80 bg-primary/20 px-3 py-1 rounded animate-pulse">
                    MARKET AVG: {marketStats.avg_change > 0 ? '+' : ''}{marketStats.avg_change}%
                  </span>
                </>
              )}

              {/* Duplicate Stock Tickers */}
              {!loading && topMovers.map((stock: any) => (
                <Link 
                  key={`scroll2-${stock.ticker}`}
                  to={`/stock/${stock.ticker}`}
                  className="flex items-center gap-2 hover:bg-primary/20 px-3 py-1 rounded transition-all border border-primary/20 animate-pulse"
                >
                  <span className={`font-mono font-bold transition-colors duration-150 ${flickerStates[stock.ticker] || 'text-primary'}`}>
                    {stock.ticker}
                  </span>
                  <span className={`font-mono transition-colors duration-200 ${flickerStates[`${stock.ticker}-price`] || 'text-primary/80'}`}>
                    ${liveNumbers[stock.ticker]?.toFixed(2) || stock.price?.toFixed(2)}
                  </span>
                  <span className={`font-mono transition-colors duration-150 ${
                    Math.random() > 0.5 ? 'text-emerald-300' : 'text-red-300'
                  }`}>
                    {Math.random() > 0.5 ? '+' : '-'}{(Math.random() * 5).toFixed(2)}%
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="bg-black border-b border-border">
        <div className="container mx-auto">
          <div className="flex items-center justify-between h-12 px-4">
            {/* Platform Brand */}
            <Link 
              to="/" 
              className="flex items-center gap-3 group"
              aria-label="Vin Stock Terminal"
            >
              <div className="relative">
                <div className="flex h-8 w-8 items-center justify-center rounded bg-gradient-to-br from-primary to-primary/80 shadow-lg group-hover:shadow-primary/25 transition-all">
                  <BarChart3 className="h-4 w-4 text-primary-foreground" />
                </div>
                <div className="absolute -inset-1 rounded bg-gradient-to-br from-primary/20 to-primary/10 blur-sm -z-10" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                  VIN TERMINAL
                </span>
                <span className="text-xs text-primary/80 -mt-1 font-mono">
                  AI-POWERED ANALYTICS
                </span>
              </div>
            </Link>
            
            {/* Fullscreen Toggle Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleFullscreen}
              className="h-8 w-8 p-0 text-primary/80 hover:text-primary hover:bg-primary/10 transition-all"
              aria-label={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            >
              {isFullscreen ? (
                <Minimize className="h-4 w-4" />
              ) : (
                <Maximize className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>

    </header>
  );
};

export default Header;