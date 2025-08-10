import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import PriceChangeTicker from "@/components/PriceChangeTicker";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { useMarketDashboard } from "@/hooks/useMarketDashboard";

interface MoverItem {
  ticker: string;
  name?: string;
  logo?: string;
  changePercent: number;
  currentPrice: number;
  priceChange: number;
  volume?: number;
}

export function MarketMovers() {
  const navigate = useNavigate();
  const { data, loading } = useMarketDashboard();

  // Use market movers from atomic dashboard data
  const dashboardData = data as any;
  const movers = dashboardData?.market_movers || { gainers: [], losers: [] };
  const marketStats = dashboardData?.market_stats;
  const lastUpdated = dashboardData?.timestamp;

  // Determine US market status using New York time
  const marketOpen = (() => {
    try {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York', hour12: false,
        weekday: 'short', hour: '2-digit', minute: '2-digit'
      }).formatToParts(new Date());
      const wd = parts.find(p => p.type === 'weekday')?.value ?? '';
      const hr = parseInt(parts.find(p => p.type === 'hour')?.value ?? '0', 10);
      const min = parseInt(parts.find(p => p.type === 'minute')?.value ?? '0', 10);
      const dayOpen = ['Mon','Tue','Wed','Thu','Fri'].includes(wd);
      const t = hr * 60 + min;
      return dayOpen && t >= 570 && t < 960;
    } catch {
      return false;
    }
  })();

  const renderList = (items: MoverItem[], positiveSide: boolean) => (
    <div className="flex-1 min-w-0">
      <div className="mb-3 pb-2 border-b border-border">
        <div className="flex items-center gap-2">
          {positiveSide ? (
            <ArrowUpRight className="h-4 w-4 text-success" />
          ) : (
            <ArrowDownRight className="h-4 w-4 text-destructive" />
          )}
          <h3 className="text-base font-semibold text-foreground">
            {positiveSide ? "Top Gainers" : "Top Losers"}
          </h3>
        </div>
        <p className="text-xs text-muted-foreground">
          {positiveSide ? "Biggest percentage increases today" : "Biggest percentage drops today"}
        </p>
      </div>
      <div className="space-y-2">
        {items.slice(0, 10).map((item) => {
          const positive = item.changePercent > 0;
          return (
            <div 
              key={`${item.ticker}-${item.changePercent}`} 
              className="flex items-center justify-between py-1 cursor-pointer hover:bg-accent/40 rounded-md px-2 transition-all duration-300 hover:scale-105 hover:border-primary/30 border border-transparent group"
              onClick={() => navigate(`/stock/${item.ticker}`)}
            >
              <div className="min-w-0 mr-3 flex-1 flex items-center gap-2">
                <img
                  src={item.logo || "/placeholder.svg"}
                  alt={`${item.name || item.ticker} logo`}
                  loading="lazy"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = "/placeholder.svg";
                  }}
                  className="h-6 w-6 rounded bg-muted object-contain flex-shrink-0 group-hover:scale-110 transition-transform duration-300"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors duration-300">{item.ticker}</div>
                  {item.name && (
                    <div className="text-xs text-muted-foreground truncate group-hover:text-muted-foreground/90 transition-colors duration-300">{item.name}</div>
                  )}
                  <div className="text-xs text-muted-foreground group-hover:text-muted-foreground/90 transition-colors duration-300">
                    ${item.currentPrice?.toFixed(2)} • {positive ? "+" : ""}${item.priceChange?.toFixed(2)}
                  </div>
                </div>
              </div>
              <div className="group-hover:scale-110 transition-transform duration-300">
                <PriceChangeTicker initial={item.changePercent || 0} className="text-sm font-semibold" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <section aria-label="Market Movers" className="space-y-4">
      <Card className="p-4">
        <header className="mb-4 flex items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Market Movers</h2>
            <p className="text-sm text-muted-foreground">Today's biggest stock movements</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-2 py-0.5 rounded-full text-xs border ${marketOpen ? 'bg-success/10 text-success border-success/20' : 'bg-muted text-muted-foreground border-border'}`}>
              {marketOpen ? 'Market Open' : 'Market Closed'}
            </span>
            <span className="text-xs text-muted-foreground">
              {lastUpdated ? `Updated ${Math.max(0, Math.floor((Date.now() - lastUpdated) / 1000))}s ago` : 'Updating…'}
            </span>
            {marketStats && (
              <span className="text-xs text-muted-foreground">
                {marketStats.gainers_count}↑ {marketStats.losers_count}↓
              </span>
            )}
          </div>
        </header>
        
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-6">
            {renderList(movers.gainers, true)}
            <div className="hidden sm:block w-px bg-border flex-shrink-0"></div>
            <div className="block sm:hidden h-px bg-border"></div>
            {renderList(movers.losers, false)}
          </div>
        )}
      </Card>
    </section>
  );
}
