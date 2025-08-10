import { TrendingUp, TrendingDown, Activity, DollarSign, BarChart3, Clock, Zap } from "lucide-react";
import { useState, useEffect } from "react";
import { isMarketOpen } from "@/utils/marketStatus";

interface StockHeaderCardProps {
  stock: {
    ticker: string;
    name: string;
    logo?: string;
    current_price: number;
    price_change: number;
    change_percent: number;
    open: number;
    high: number;
    low: number;
    volume: number;
  };
}

export function StockHeaderCard({ stock }: StockHeaderCardProps) {
  const [animatedPrice, setAnimatedPrice] = useState(stock.current_price);
  const [priceDirection, setPriceDirection] = useState<'up' | 'down' | 'neutral'>('neutral');
  const [marketStatus, setMarketStatus] = useState(isMarketOpen());
  const isPositive = stock.price_change >= 0;

  // Simulate live price updates for visual effect
  useEffect(() => {
    const interval = setInterval(() => {
      const variation = (Math.random() - 0.5) * stock.current_price * 0.002;
      const newPrice = Math.max(0.01, stock.current_price + variation);
      const oldPrice = animatedPrice;
      
      setAnimatedPrice(newPrice);
      setPriceDirection(newPrice > oldPrice ? 'up' : newPrice < oldPrice ? 'down' : 'neutral');
    }, 2000);

    return () => clearInterval(interval);
  }, [stock.current_price, animatedPrice]);

  const formatPrice = (price: number) => price.toFixed(2);
  const formatVolume = (volume: number) => {
    if (volume >= 1000000000) return `${(volume / 1000000000).toFixed(1)}B`;
    if (volume >= 1000000) return `${(volume / 1000000).toFixed(1)}M`;
    if (volume >= 1000) return `${(volume / 1000).toFixed(1)}K`;
    return volume.toString();
  };

  const getCurrentTime = () => {
    return new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'America/New_York'
    });
  };

  const [currentTime, setCurrentTime] = useState(getCurrentTime());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(getCurrentTime());
      setMarketStatus(isMarketOpen());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative overflow-hidden mb-6">
      {/* Animated Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-black/95 to-black/90"></div>
      <div className={`absolute inset-0 bg-gradient-to-r ${
        isPositive 
          ? 'from-emerald-500/5 via-transparent to-emerald-500/10' 
          : 'from-red-500/5 via-transparent to-red-500/10'
      } animate-pulse`}></div>
      
      {/* Border with glow effect */}
      <div className={`absolute inset-0 rounded-lg border ${
        isPositive ? 'border-emerald-500/30' : 'border-red-500/30'
      } shadow-lg ${
        isPositive ? 'shadow-emerald-500/10' : 'shadow-red-500/10'
      }`}></div>

      <div className="relative p-5">
        {/* Compact Header Row */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            {/* Compact Logo */}
            <div className="relative">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-background/20 to-background/5 backdrop-blur-sm border border-primary/30 p-2 flex items-center justify-center">
                <img
                  src={stock.logo || "/placeholder.svg"}
                  alt={`${stock.name} logo`}
                  loading="lazy"
                  className="w-full h-full object-contain filter brightness-110"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = "/placeholder.svg";
                  }}
                />
              </div>
            </div>

            {/* Compact Company Info */}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-primary font-mono tracking-wider">
                  {stock.ticker}
                </h1>
                <div className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full animate-pulse ${
                    priceDirection === 'up' ? 'bg-emerald-400' :
                    priceDirection === 'down' ? 'bg-red-400' : 'bg-primary'
                  }`}></div>
                  <span className="text-xs text-primary/80 font-mono">LIVE</span>
                </div>
              </div>
              <h2 className="text-sm text-muted-foreground">{stock.name}</h2>
            </div>
          </div>

          {/* Compact Performance & Time */}
          <div className="text-right space-y-1">
            <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold ${
              marketStatus 
                ? 'bg-emerald-500/20 text-emerald-400' 
                : 'bg-muted text-muted-foreground'
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full ${
                marketStatus ? 'bg-emerald-400 animate-pulse' : 'bg-muted-foreground'
              }`}></div>
              <span>{marketStatus ? 'OPEN' : 'CLOSED'}</span>
            </div>
            <div className="text-xs text-muted-foreground font-mono">
              {currentTime} EST
            </div>
          </div>
        </div>

        {/* Compact Price & Data Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Main Price - Spans 2 columns */}
          <div className="lg:col-span-2">
            <div className={`transition-all duration-300 ${
              priceDirection === 'up' ? 'animate-price-tick-up' :
              priceDirection === 'down' ? 'animate-price-tick-down' : ''
            }`}>
              <div className="text-3xl font-bold text-primary font-mono">
                ${formatPrice(animatedPrice)}
              </div>
            </div>
            
            <div className={`flex items-center gap-2 text-lg font-bold ${
              isPositive ? 'text-emerald-400' : 'text-red-400'
            }`}>
              {isPositive ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              <span className="font-mono text-sm">
                {isPositive ? '+' : ''}${formatPrice(stock.price_change)}
              </span>
              <div className={`px-2 py-0.5 rounded text-sm font-mono ${
                isPositive 
                  ? 'bg-emerald-500/20 border border-emerald-500/30' 
                  : 'bg-red-500/20 border border-red-500/30'
              }`}>
                {isPositive ? '+' : ''}{stock.change_percent.toFixed(2)}%
              </div>
            </div>

            {/* Compact Price Range */}
            <div className="mt-2">
              <div className="flex justify-between text-xs text-muted-foreground font-mono mb-1">
                <span>${formatPrice(stock.low)}</span>
                <span>${formatPrice(stock.high)}</span>
              </div>
              <div className="relative h-1 bg-muted/20 rounded-full">
                <div 
                  className="absolute w-2 h-2 bg-primary rounded-full border border-background -top-0.5"
                  style={{
                    left: `${((stock.current_price - stock.low) / (stock.high - stock.low)) * 100}%`,
                    transform: 'translateX(-50%)'
                  }}
                ></div>
              </div>
            </div>
          </div>

          {/* Compact Market Data - Spans 3 columns */}
          <div className="lg:col-span-3 grid grid-cols-4 gap-2">
            <div className="p-2 bg-primary/10 border border-primary/20 rounded">
              <div className="text-xs text-primary/60 font-mono">OPEN</div>
              <div className="text-sm font-bold text-primary font-mono">${formatPrice(stock.open)}</div>
            </div>
            
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded">
              <div className="text-xs text-emerald-400/60 font-mono">HIGH</div>
              <div className="text-sm font-bold text-emerald-400 font-mono">${formatPrice(stock.high)}</div>
            </div>
            
            <div className="p-2 bg-red-500/10 border border-red-500/20 rounded">
              <div className="text-xs text-red-400/60 font-mono">LOW</div>
              <div className="text-sm font-bold text-red-400 font-mono">${formatPrice(stock.low)}</div>
            </div>
            
            <div className="p-2 bg-primary/10 border border-primary/20 rounded">
              <div className="text-xs text-primary/60 font-mono">VOL</div>
              <div className="text-sm font-bold text-primary font-mono">{formatVolume(stock.volume)}</div>
            </div>
          </div>
        </div>

        {/* Ultra Compact Bottom Status */}
        <div className="flex items-center justify-between pt-3 mt-3 border-t border-primary/20">
          <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono">
            <div className="flex items-center gap-1">
              <div className={`w-1.5 h-1.5 rounded-full ${
                marketStatus ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'
              }`}></div>
              <span>MARKET {marketStatus ? 'OPEN' : 'CLOSED'}</span>
            </div>
          </div>
          
          <div className={`px-2 py-1 rounded text-xs font-mono ${
            isPositive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
          }`}>
            {isPositive ? '+' : ''}{((stock.price_change / (stock.current_price - stock.price_change)) * 100).toFixed(2)}% Today
          </div>
        </div>
      </div>
    </div>
  );
}