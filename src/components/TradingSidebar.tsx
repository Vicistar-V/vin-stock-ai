import { NavLink, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  BarChart3, 
  Lightbulb, 
  PieChart, 
  Target, 
  TrendingUp, 
  TrendingDown, 
  ChevronRight,
  Clock,
  DollarSign,
  Activity,
  Zap
} from "lucide-react";
import { useMarketDashboard } from "@/hooks/useMarketDashboard";
import { useState, useEffect } from "react";

const TradingSidebar = () => {
  const { data: marketData, loading } = useMarketDashboard();
  const dashboardData = marketData as any;
  const marketStats = dashboardData?.market_stats;
  const topMovers = dashboardData?.popular_stocks?.slice(0, 12) || [];
  const gainers = dashboardData?.market_movers?.gainers?.slice(0, 6) || [];
  const losers = dashboardData?.market_movers?.losers?.slice(0, 6) || [];

  // Live price updates
  const [livePrices, setLivePrices] = useState<Record<string, number>>({});
  const [priceChanges, setPriceChanges] = useState<Record<string, 'up' | 'down' | 'neutral'>>({});

  useEffect(() => {
    if (!topMovers.length) return;

    const interval = setInterval(() => {
      setLivePrices(prev => {
        const updated = { ...prev };
        topMovers.forEach((stock: any) => {
          const basePrice = stock.price || 100;
          const variation = (Math.random() - 0.5) * basePrice * 0.015;
          const oldPrice = prev[stock.ticker] || basePrice;
          const newPrice = Math.max(0.01, basePrice + variation);
          
          updated[stock.ticker] = newPrice;
          
          // Track price direction
          setPriceChanges(prevChanges => ({
            ...prevChanges,
            [stock.ticker]: newPrice > oldPrice ? 'up' : newPrice < oldPrice ? 'down' : 'neutral'
          }));
        });
        return updated;
      });
    }, 750);

    return () => clearInterval(interval);
  }, [topMovers.length]);

  const navItems = [
    { 
      to: "/", 
      label: "Trading Terminal", 
      icon: Activity,
      description: "Market overview & search",
      primary: false
    },
    { 
      to: "/sector-pulse", 
      label: "Sector Pulse", 
      icon: PieChart,
      description: "Market sectors overview",
      primary: false
    },
    { 
      to: "/portfolio-analysis", 
      label: "Portfolio Analysis", 
      icon: Target,
      description: "Track your investments",
      primary: false
    },
    { 
      to: "/ai-screener", 
      label: "AI Stock Screener", 
      icon: Lightbulb,
      description: "AI-powered stock discovery",
      primary: false
    },
  ];

  const formatPrice = (price: number) => price?.toFixed(2) || '0.00';
  const formatPercent = (percent: number) => `${percent > 0 ? '+' : ''}${percent?.toFixed(2)}%`;

  return (
    <aside className="w-80 bg-black/98 backdrop-blur-sm border-r border-primary/20 h-screen overflow-y-auto fixed left-0 top-0 z-40 scrollbar-thin scrollbar-track-black/20 scrollbar-thumb-primary/30 hover:scrollbar-thumb-primary/50">
      {/* Header */}
      <div className="p-4 border-b border-primary/20">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="h-4 w-4 text-primary animate-pulse" />
          <span className="text-xs font-mono text-primary/80 uppercase tracking-wider">Live Market Data</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span className="font-mono">
            {new Date().toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              timeZone: 'America/New_York'
            })} EST
          </span>
        </div>
      </div>

      {/* Navigation */}
      <div className="p-4 border-b border-primary/20">
        <h3 className="text-xs font-mono text-primary/60 uppercase tracking-wider mb-3">Navigation</h3>
        <nav className="space-y-1">
          {navItems.map(({ to, label, icon: Icon, description, primary }) => (
            <NavLink key={to} to={to} end>
              {({ isActive }) => (
                <div
                  className={`
                    relative p-3 rounded-lg border transition-all cursor-pointer group
                    ${isActive 
                      ? "bg-primary/10 border-primary/30 text-primary" 
                      : "border-primary/10 hover:border-primary/20 hover:bg-primary/5"
                    }
                    ${primary && !isActive ? "border-primary/20" : ""}
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Icon className={`h-4 w-4 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                      <div>
                        <div className={`text-sm font-medium ${isActive ? 'text-primary' : 'text-foreground'}`}>
                          {label}
                        </div>
                        <div className="text-xs text-muted-foreground">{description}</div>
                      </div>
                    </div>
                    <ChevronRight className={`h-3 w-3 transition-transform ${isActive ? 'rotate-90 text-primary' : 'text-muted-foreground group-hover:translate-x-1'}`} />
                  </div>
                  {primary && (
                    <div className="absolute -top-1 -right-1">
                      <Zap className="h-3 w-3 text-primary animate-pulse" />
                    </div>
                  )}
                </div>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Market Stats */}
      {!loading && marketStats && (
        <div className="p-4 border-b border-primary/20">
          <h3 className="text-xs font-mono text-primary/60 uppercase tracking-wider mb-3">Market Overview</h3>
          <div className="grid grid-cols-2 gap-2">
            <Card className="p-3 bg-emerald-500/10 border-emerald-500/20">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-3 w-3 text-emerald-400" />
                <div>
                  <div className="text-xs text-emerald-300">Gainers</div>
                  <div className="text-lg font-bold text-emerald-400">{marketStats.gainers_count}</div>
                </div>
              </div>
            </Card>
            <Card className="p-3 bg-red-500/10 border-red-500/20">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-3 w-3 text-red-400" />
                <div>
                  <div className="text-xs text-red-300">Losers</div>
                  <div className="text-lg font-bold text-red-400">{marketStats.losers_count}</div>
                </div>
              </div>
            </Card>
          </div>
          <Card className="p-3 mt-2 bg-primary/10 border-primary/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-3 w-3 text-primary" />
                <span className="text-xs text-primary/80">Market Avg</span>
              </div>
              <span className={`text-sm font-bold font-mono ${
                marketStats.avg_change > 0 ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {formatPercent(marketStats.avg_change)}
              </span>
            </div>
          </Card>
        </div>
      )}

      {/* Top Gainers */}
      {!loading && gainers.length > 0 && (
        <div className="p-4 border-b border-primary/20">
          <h3 className="text-xs font-mono text-primary/60 uppercase tracking-wider mb-3">Top Gainers</h3>
          <div className="space-y-2">
            {gainers.slice(0, 4).map((stock: any) => (
              <div key={stock.ticker} className="flex items-center justify-between p-2 rounded bg-emerald-500/5 border border-emerald-500/20 hover:bg-emerald-500/10 transition-colors">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                  <div>
                    <div className="text-sm font-bold text-foreground font-mono">{stock.ticker}</div>
                    <div className="text-xs text-muted-foreground truncate w-20">{stock.name}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-mono text-foreground">
                    ${formatPrice(livePrices[stock.ticker] || stock.currentPrice)}
                  </div>
                  <div className="text-xs font-mono text-emerald-400">
                    {formatPercent(stock.changePercent)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Losers */}
      {!loading && losers.length > 0 && (
        <div className="p-4 border-b border-primary/20">
          <h3 className="text-xs font-mono text-primary/60 uppercase tracking-wider mb-3">Top Losers</h3>
          <div className="space-y-2">
            {losers.slice(0, 4).map((stock: any) => (
              <div key={stock.ticker} className="flex items-center justify-between p-2 rounded bg-red-500/5 border border-red-500/20 hover:bg-red-500/10 transition-colors">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse"></div>
                  <div>
                    <div className="text-sm font-bold text-foreground font-mono">{stock.ticker}</div>
                    <div className="text-xs text-muted-foreground truncate w-20">{stock.name}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-mono text-foreground">
                    ${formatPrice(livePrices[stock.ticker] || stock.currentPrice)}
                  </div>
                  <div className="text-xs font-mono text-red-400">
                    {formatPercent(stock.changePercent)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Live Watchlist */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-mono text-primary/60 uppercase tracking-wider">Live Watchlist</h3>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
            <span className="text-xs text-primary/80">LIVE</span>
          </div>
        </div>
        <div className="space-y-1">
          {topMovers.slice(0, 8).map((stock: any) => {
            const currentPrice = livePrices[stock.ticker] || stock.price;
            const change = priceChanges[stock.ticker];
            
            return (
              <div 
                key={stock.ticker} 
                className={`
                  flex items-center justify-between p-2 rounded transition-all duration-300
                  ${change === 'up' ? 'bg-emerald-500/10 border-l-2 border-emerald-500' : 
                    change === 'down' ? 'bg-red-500/10 border-l-2 border-red-500' : 
                    'bg-primary/5 hover:bg-primary/10'}
                `}
              >
                <div className="flex items-center gap-2">
                  <DollarSign className="h-3 w-3 text-primary/60" />
                  <span className="text-sm font-bold text-foreground font-mono">{stock.ticker}</span>
                </div>
                <div className={`text-sm font-mono transition-colors duration-300 ${
                  change === 'up' ? 'text-emerald-400' :
                  change === 'down' ? 'text-red-400' :
                  'text-foreground'
                }`}>
                  ${formatPrice(currentPrice)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
};

export default TradingSidebar;