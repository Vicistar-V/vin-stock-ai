import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { TrendingUp, TrendingDown, Minus, X, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

interface StockData {
  ticker: string;
  currentPrice: number;
  previousClose: number;
  dayHigh: number;
  dayLow: number;
  openPrice: number;
  priceChange: number;
  priceChangePercent: number;
  timestamp: number;
  company?: {
    name: string;
    logo?: string;
    country: string;
    currency: string;
    exchange: string;
    marketCap: number;
    industry: string;
    website: string;
  };
}

interface StockCardProps {
  data: StockData | null;
  open: boolean;
  onClose: () => void;
}

export function StockCard({ data, open, onClose }: StockCardProps) {
  const navigate = useNavigate();
  const [isNavigating, setIsNavigating] = useState(false);
  
  if (!data) return null;
  
  const isPositive = data.priceChange > 0;
  const isNegative = data.priceChange < 0;
  
  const handleCardClick = (e: React.MouseEvent) => {
    // Prevent navigation if clicking on the close button or website link
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('a')) {
      return;
    }
    navigate(`/stock/${data.ticker}`);
  };

  const handleViewDetails = async () => {
    setIsNavigating(true);
    // Add a small delay for better UX
    setTimeout(() => {
      navigate(`/stock/${data.ticker}`);
    }, 500);
  };
  
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: data.company?.currency || 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  };

  const formatMarketCap = (marketCap: number) => {
    if (marketCap >= 1000000) {
      return `$${(marketCap / 1000000).toFixed(2)}T`;
    } else if (marketCap >= 1000) {
      return `$${(marketCap / 1000).toFixed(2)}B`;
    } else {
      return `$${marketCap.toFixed(2)}M`;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-track-background scrollbar-thumb-primary/30 hover:scrollbar-thumb-primary/50 bg-black/95 backdrop-blur-xl border-primary/30">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {data.company?.logo && (
                <img 
                  src={data.company.logo} 
                  alt={`${data.company.name} logo`}
                  loading="lazy"
                  className="w-12 h-12 rounded-lg object-contain bg-background/10 p-1"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              )}
              <div>
                <h2 className="text-2xl font-bold text-primary">{data.ticker}</h2>
                {data.company?.name && (
                  <p className="text-muted-foreground">{data.company.name}</p>
                )}
              </div>
            </div>
            
            {data.company && (
              <div className="text-right text-sm text-muted-foreground">
                <div>{data.company.exchange}</div>
                <div>{data.company.currency}</div>
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Price Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="p-4 bg-primary/10 rounded-lg border border-primary/30">
                <div className="text-3xl font-bold text-primary">
                  {formatPrice(data.currentPrice)}
                </div>
                <div className={`flex items-center gap-2 text-lg font-medium ${
                  isPositive ? 'text-success' : isNegative ? 'text-destructive' : 'text-muted-foreground'
                }`}>
                  {isPositive ? (
                    <TrendingUp className="h-5 w-5" />
                  ) : isNegative ? (
                    <TrendingDown className="h-5 w-5" />
                  ) : (
                    <Minus className="h-5 w-5" />
                  )}
                  <span>
                    {isPositive ? '+' : ''}{formatPrice(data.priceChange)} 
                    ({isPositive ? '+' : ''}{data.priceChangePercent.toFixed(2)}%)
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2 p-4 bg-card/50 rounded-lg border border-border/50">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Previous Close</span>
                <span className="text-foreground font-medium">{formatPrice(data.previousClose)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Open</span>
                <span className="text-foreground font-medium">{formatPrice(data.openPrice)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Day High</span>
                <span className="text-foreground font-medium">{formatPrice(data.dayHigh)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Day Low</span>
                <span className="text-foreground font-medium">{formatPrice(data.dayLow)}</span>
              </div>
              {data.company?.marketCap && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Market Cap</span>
                  <span className="text-foreground font-medium">{formatMarketCap(data.company.marketCap)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Company Information */}
          {data.company && (
            <div className="p-4 bg-card/30 rounded-lg border border-border/30">
              <h3 className="text-lg font-semibold text-primary mb-3">Company Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Industry</span>
                  <span className="text-foreground">{data.company.industry}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Country</span>
                  <span className="text-foreground">{data.company.country}</span>
                </div>
                {data.company.website && (
                  <div className="flex justify-between md:col-span-2">
                    <span className="text-muted-foreground">Website</span>
                    <a 
                      href={data.company.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {data.company.website}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4">
            <Button 
              onClick={handleViewDetails}
              disabled={isNavigating}
              className="flex-1 bg-primary/20 hover:bg-primary/30 border border-primary/40 text-primary disabled:opacity-50"
            >
              {isNavigating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                "View Detailed Analysis"
              )}
            </Button>
            <Button 
              variant="outline" 
              onClick={onClose}
              className="px-8"
            >
              Close
            </Button>
          </div>

          {/* Timestamp */}
          <div className="text-xs text-muted-foreground text-center pt-2 border-t border-border/30">
            Last updated: {new Date(data.timestamp * 1000).toLocaleString()}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}