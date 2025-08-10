import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import LoadingOverlay from "./LoadingOverlay";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  TrendingUp, 
  Search, 
  Loader2, 
  ArrowLeftRight, 
  DollarSign, 
  BarChart3, 
  Target,
  Trophy,
  Activity,
  Zap
} from "lucide-react";
import { toast as sonnerToast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface CompetitorAnalysisProps {
  currentTicker: string;
  currentCompanyName: string;
}

interface ComparisonData {
  valuation_summary: string;
  financials_summary: string;
  momentum_summary: string;
  winner: string;
}

interface ComparisonResult {
  ticker1: string;
  ticker2: string;
  comparison: ComparisonData;
}

interface CompanyData {
  ticker: string;
  name: string;
  currentPrice: number;
  priceChange: number;
  priceChangePercent: number;
}

const CompetitorAnalysis: React.FC<CompetitorAnalysisProps> = ({ 
  currentTicker, 
  currentCompanyName 
}) => {
  const [competitorQuery, setCompetitorQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<ComparisonResult | null>(null);
  const [competitorData, setCompetitorData] = useState<CompanyData | null>(null);
  const [currentCompanyData, setCurrentCompanyData] = useState<CompanyData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { toast } = useToast();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!competitorQuery.trim()) {
      sonnerToast.error("Please enter a competitor to search for");
      return;
    }

    setIsSearching(true);
    
    try {
      // Use the same smart search functionality as the main search
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stock-search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ query: competitorQuery.trim() })
      });

      const searchData = await response.json();

      if (!response.ok) {
        const errorMessage = searchData.error || 'Failed to find competitor. Please try again.';
        sonnerToast.error(errorMessage);
        return;
      }

      // Store competitor data
      setCompetitorData({
        ticker: searchData.ticker,
        name: searchData.company?.name || searchData.ticker,
        currentPrice: searchData.currentPrice,
        priceChange: searchData.priceChange,
        priceChangePercent: searchData.priceChangePercent
      });

      // Also fetch current company data for comparison
      const currentResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stock-search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ query: currentTicker })
      });

      if (currentResponse.ok) {
        const currentData = await currentResponse.json();
        setCurrentCompanyData({
          ticker: currentData.ticker,
          name: currentData.company?.name || currentCompanyName,
          currentPrice: currentData.currentPrice,
          priceChange: currentData.priceChange,
          priceChangePercent: currentData.priceChangePercent
        });
      }

      sonnerToast.success(`Found ${searchData.ticker} - ${searchData.company?.name || searchData.ticker}`);
      
      setIsAnalyzing(true);
      
      try {
        const { data, error } = await supabase.functions.invoke('compare-stocks', {
          body: {
            ticker1: currentTicker,
            ticker2: searchData.ticker
          }
        });

        if (error) throw error;

        if (data.success) {
          setAnalysisResult(data);
          setIsModalOpen(true); // Open the modal when analysis is complete
          toast({
            title: "Analysis Complete",
            description: `Comparison between ${currentTicker} and ${searchData.ticker} is ready`,
          });
        } else {
          throw new Error(data.error || 'Analysis failed');
        }
      } catch (error) {
        console.error('Analysis error:', error);
        toast({
          title: "Analysis Failed",
          description: error instanceof Error ? error.message : "Failed to generate comparison",
          variant: "destructive",
        });
      } finally {
        setIsAnalyzing(false);
      }
      
    } catch (error: any) {
      console.error('Search error:', error);
      const errorMessage = error.message || 'Failed to search for competitor. Please try again.';
      sonnerToast.error(errorMessage);
    } finally {
      setIsSearching(false);
    }
  };

  const isLoading = isSearching || isAnalyzing;

  const ComparisonModal = () => (
    <DialogContent className="max-w-4xl w-full h-[80vh] flex flex-col bg-black/95 border-primary/30">
      <DialogHeader className="flex-shrink-0 border-b border-primary/20 pb-3">
        <DialogTitle className="flex items-center gap-2 text-lg font-mono text-primary">
          <ArrowLeftRight className="h-4 w-4" />
          {currentTicker} vs {competitorData?.ticker} Comparison
        </DialogTitle>
        <p className="text-xs text-muted-foreground font-mono">
          AI Analysis • Real-time data
        </p>
      </DialogHeader>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 scrollbar-thin scrollbar-track-black/20 scrollbar-thumb-primary/30 hover:scrollbar-thumb-primary/50">
        {/* Company Headers - Compact */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gradient-to-r from-blue-500/20 to-blue-600/10 border border-blue-500/30 rounded-lg p-3">
            <div className="text-center space-y-1">
              <div className="w-8 h-8 bg-blue-500/30 rounded-full flex items-center justify-center mx-auto">
                <span className="text-xs font-bold text-blue-400">{currentTicker}</span>
              </div>
              <h3 className="text-sm font-medium text-blue-400">{currentCompanyName}</h3>
              <Badge variant="outline" className="text-xs border-blue-500/50 text-blue-400 px-2 py-0">
                Current
              </Badge>
            </div>
          </div>

          <div className="bg-gradient-to-r from-red-500/20 to-red-600/10 border border-red-500/30 rounded-lg p-3">
            <div className="text-center space-y-1">
              <div className="w-8 h-8 bg-red-500/30 rounded-full flex items-center justify-center mx-auto">
                <span className="text-xs font-bold text-red-400">{competitorData?.ticker}</span>
              </div>
              <h3 className="text-sm font-medium text-red-400">{competitorData?.name}</h3>
              <Badge variant="outline" className="text-xs border-red-500/50 text-red-400 px-2 py-0">
                Competitor
              </Badge>
            </div>
          </div>
        </div>

        {/* Price Comparison - Ultra Compact */}
        {currentCompanyData && competitorData && (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-500/10 border border-blue-500/20 rounded p-2 text-center">
              <div className="text-lg font-bold text-blue-400">
                ${(currentCompanyData.currentPrice || 0).toFixed(2)}
              </div>
              <div className={`text-xs flex items-center justify-center gap-1 ${
                (currentCompanyData.priceChangePercent || 0) >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {(currentCompanyData.priceChangePercent || 0) >= 0 ? 
                  <TrendingUp className="h-3 w-3" /> : 
                  <TrendingUp className="h-3 w-3 rotate-180" />
                }
                {Math.abs(currentCompanyData.priceChangePercent || 0).toFixed(2)}%
              </div>
            </div>
            <div className="bg-red-500/10 border border-red-500/20 rounded p-2 text-center">
              <div className="text-lg font-bold text-red-400">
                ${(competitorData.currentPrice || 0).toFixed(2)}
              </div>
              <div className={`text-xs flex items-center justify-center gap-1 ${
                (competitorData.priceChangePercent || 0) >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {(competitorData.priceChangePercent || 0) >= 0 ? 
                  <TrendingUp className="h-3 w-3" /> : 
                  <TrendingUp className="h-3 w-3 rotate-180" />
                }
                {Math.abs(competitorData.priceChangePercent || 0).toFixed(2)}%
              </div>
            </div>
          </div>
        )}

        {/* Analysis Sections - Super Compact */}
        {analysisResult && (
          <div className="space-y-3">
            {/* Valuation */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <DollarSign className="h-3 w-3 text-primary" />
                <h4 className="text-sm font-medium text-primary">Valuation</h4>
              </div>
              <div className="bg-primary/10 border border-primary/20 rounded p-2">
                <p className="text-xs text-foreground/90 leading-relaxed">
                  {analysisResult.comparison.valuation_summary}
                </p>
              </div>
            </div>

            {/* Financials */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-3 w-3 text-emerald-400" />
                <h4 className="text-sm font-medium text-emerald-400">Financials</h4>
              </div>
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded p-2">
                <p className="text-xs text-foreground/90 leading-relaxed">
                  {analysisResult.comparison.financials_summary}
                </p>
              </div>
            </div>

            {/* Momentum */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Activity className="h-3 w-3 text-purple-400" />
                <h4 className="text-sm font-medium text-purple-400">Momentum</h4>
              </div>
              <div className="bg-purple-500/10 border border-purple-500/20 rounded p-2">
                <p className="text-xs text-foreground/90 leading-relaxed">
                  {analysisResult.comparison.momentum_summary}
                </p>
              </div>
            </div>

            {/* Winner - Compact */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Trophy className="h-3 w-3 text-yellow-400" />
                <h4 className="text-sm font-medium text-yellow-400">Verdict</h4>
              </div>
              <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded p-3">
                <p className="text-sm text-foreground font-medium leading-relaxed">
                  {analysisResult.comparison.winner}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Compact Disclaimer */}
        <div className="text-xs text-muted-foreground text-center pt-2 border-t border-primary/20 font-mono">
          AI analysis • Not financial advice • DYOR
        </div>
      </div>
    </DialogContent>
  );

  return (
    <div className="space-y-6">
      {/* Search Section */}
      <div className="p-4 bg-black/80 border border-primary/20 rounded-lg backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-mono text-primary uppercase tracking-wider">
            Competitor Search • AI Analysis
          </h3>
          <div className="flex-1 h-px bg-gradient-to-r from-primary/50 to-transparent"></div>
        </div>

        <form onSubmit={handleSearch} className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-primary/60 h-4 w-4" />
            <Input
              placeholder="Enter competitor (e.g., 'Microsoft', 'GOOGL', 'the search engine company')"
              value={competitorQuery}
              onChange={(e) => setCompetitorQuery(e.target.value)}
              disabled={isLoading}
              className="pl-10 bg-black/60 border-primary/30 text-foreground placeholder:text-muted-foreground focus:border-primary/50 font-mono text-sm"
            />
          </div>
          
          <Button 
            type="submit"
            disabled={isLoading || !competitorQuery.trim()}
            variant="ghost"
            className="w-full bg-primary/10 border border-primary/30 hover:bg-primary/20 hover:border-primary/50 transition-all duration-300"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin text-primary" />
                <span className="font-mono text-xs uppercase tracking-wider text-primary">
                  {isSearching ? 'Searching...' : 'Analyzing...'}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Zap className="h-3 w-3 text-primary" />
                <span className="font-mono text-xs uppercase tracking-wider text-primary">
                  Compare & Analyze
                </span>
              </div>
            )}
          </Button>
        </form>
        
        <div className="text-xs text-muted-foreground text-center mt-3 font-mono">
          Try: "Microsoft" • "GOOGL" • "the electric car company" • "biggest social media company"
        </div>
      </div>

      {/* Simple Awesome Loading Screen */}
      {isLoading && (
        <div className="relative py-16">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-md rounded-lg border border-primary/30 flex items-center justify-center">
            <div className="text-center space-y-6">
              {/* Spinning Icon */}
              <div className="relative">
                <ArrowLeftRight className="h-12 w-12 text-primary animate-spin mx-auto" />
                <div className="absolute inset-0 h-12 w-12 border-2 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" style={{animationDuration: '2s'}}></div>
              </div>
              
              {/* Simple Status Text */}
              <div className="space-y-2">
                <h3 className="text-lg font-mono text-primary">
                  {isSearching ? 'Finding Competitor' : 'Analyzing Comparison'}
                </h3>
                <p className="text-sm text-muted-foreground font-mono">
                  {isSearching ? 'Searching market data...' : 'Running AI analysis...'}
                </p>
              </div>
              
              {/* Pulsing Dots */}
              <div className="flex justify-center gap-2">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="w-2 h-2 bg-primary rounded-full animate-pulse"
                    style={{
                      animationDelay: `${i * 0.3}s`,
                      animationDuration: '1.5s'
                    }}
                  ></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Comparison Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <ComparisonModal />
      </Dialog>

    </div>
  );
};

export default CompetitorAnalysis;