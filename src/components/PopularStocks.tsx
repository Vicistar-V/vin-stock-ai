import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useMarketDashboard } from "@/hooks/useMarketDashboard";

export function PopularStocks() {
  const navigate = useNavigate();
  const { data, loading, error } = useMarketDashboard();

  // Use popular stocks from atomic dashboard data
  const dashboardData = data as any;
  const stocks = dashboardData?.popular_stocks || [];

  // Duplicate stocks for seamless infinite scroll
  const duplicatedStocks = [...stocks, ...stocks];

  const StockItem = ({ stock }: { stock: any }) => (
    <Card 
      className="flex-shrink-0 w-48 bg-card hover:bg-accent/40 transition-all duration-300 cursor-pointer border-border/50 hover:scale-105 hover:border-primary/30 group" 
      onClick={() => navigate(`/stock/${stock.ticker}`)}
    >
      <CardContent className="p-3 flex items-center gap-3">
        <img
          src={stock.logo || "/placeholder.svg"}
          alt={`${stock.name || stock.ticker} logo`}
          loading="lazy"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = "/placeholder.svg";
          }}
          className="h-8 w-8 rounded bg-muted object-contain flex-shrink-0 group-hover:scale-110 transition-transform duration-300"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className="font-medium text-foreground text-sm truncate group-hover:text-primary transition-colors duration-300">{stock.ticker}</p>
            {stock.changePercent !== undefined && (
              <span className={`text-xs px-1.5 py-0.5 rounded font-medium transition-all duration-300 group-hover:scale-110 ${
                stock.changePercent >= 0 
                  ? 'bg-success/20 text-success group-hover:bg-success/30' 
                  : 'bg-destructive/20 text-destructive group-hover:bg-destructive/30'
              }`}>
                {stock.changePercent > 0 ? "+" : ""}{stock.changePercent.toFixed(2)}%
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate group-hover:text-muted-foreground/90 transition-colors duration-300">
            {stock.name || "—"}
          </p>
          <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors duration-300">
            {stock.price ? `$${stock.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "—"}
          </p>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Popular Stocks</h2>
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="flex-shrink-0 w-48 bg-card">
              <CardContent className="p-3 flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Popular Stocks</h2>
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive">
          {error}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-foreground">Popular Stocks</h2>
      <div className="relative overflow-hidden">
        <div className="absolute top-0 left-0 w-[200vw] flex gap-4 animate-[slide-right_30s_linear_infinite] hover:[animation-play-state:paused]">
          {duplicatedStocks.map((stock, index) => (
            <StockItem key={`${stock.ticker}-${index}`} stock={stock} />
          ))}
        </div>
        <div className="h-[88px]"></div>
      </div>
    </section>
  );
}