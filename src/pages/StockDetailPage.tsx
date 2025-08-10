import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, TrendingUp, TrendingDown, AlertTriangle, Lightbulb, Loader2 } from "lucide-react";
import TradingViewWidget from "@/components/TradingViewWidget";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AINewsAnalysis } from "@/components/AINewsAnalysis";
import { SECFilingAnalyzer } from "@/components/SECFilingAnalyzer";
import ELI5Financials from "@/components/ELI5Financials";
import CompetitorAnalysis from "@/components/CompetitorAnalysis";

import { useMarketDashboard } from "@/hooks/useMarketDashboard";
import SEO from "@/components/SEO";
import { Skeleton } from "@/components/ui/skeleton";
import Layout from "@/components/Layout";
import { StockHeaderCard } from "@/components/StockHeaderCard";

// Stock detail page component
export default function StockDetailPage() {
  const { ticker } = useParams<{ ticker: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Future outlook analysis states
  const [risksAnalysis, setRisksAnalysis] = useState<any>(null);
  const [opportunitiesAnalysis, setOpportunitiesAnalysis] = useState<any>(null);
  const [loadingRisks, setLoadingRisks] = useState(false);
  const [loadingOpportunities, setLoadingOpportunities] = useState(false);
  const [showRisksModal, setShowRisksModal] = useState(false);
  const [showOpportunitiesModal, setShowOpportunitiesModal] = useState(false);
  
  // Use atomic cache for stock detail data
  const { data, loading, error } = useMarketDashboard(ticker);
  const stockData = data as any;

  if (loading) return (
    <Layout>
      <SEO title={`${ticker} Stock | Vin Stock`} description={`Real-time price, chart, news, and filings for ${ticker}.`} canonical={`/stock/${ticker}`} />
      <div className="container mx-auto px-4 py-6">
        <div className="animate-fade-in space-y-6">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          <Card className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Skeleton className="h-24 w-full" />
              <div className="grid grid-cols-2 gap-4">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
              </div>
            </div>
          </Card>
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    </Layout>
  );
  if (error) return (
    <Layout>
      <SEO title={`${ticker} Stock | Error — Vin Stock`} description={`Error loading data for ${ticker}.`} canonical={`/stock/${ticker}`} />
      <div className="p-8 text-center text-destructive">{error}</div>
    </Layout>
   );
  if (!stockData?.stock_detail) return (
    <Layout>
      <SEO title={`${ticker} Stock Not Found | Vin Stock`} description={`We couldn't find data for ${ticker}.`} canonical={`/stock/${ticker}`} />
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Stock Not Found</h1>
          <p className="text-muted-foreground mb-4">
            We couldn't find data for {ticker}. This might be because:
          </p>
          <ul className="text-left max-w-md mx-auto space-y-2 text-muted-foreground mb-6">
            <li>• The ticker symbol is incorrect</li>
            <li>• The stock is not yet in our database</li>
            <li>• There's a temporary data issue</li>
          </ul>
          <Button onClick={() => navigate("/")}>
            Try Another Search
          </Button>
        </div>
      </div>
    </Layout>
  );

  const handleAnalyze = async (analysisType: 'risks' | 'opportunities') => {
    const isRisks = analysisType === 'risks';
    const setLoading = isRisks ? setLoadingRisks : setLoadingOpportunities;
    const setAnalysis = isRisks ? setRisksAnalysis : setOpportunitiesAnalysis;
    
    setLoading(true);
    
    try {
      console.log(`🔍 Starting ${analysisType} analysis for ${stock.ticker}`);
      
      const { data, error } = await supabase.functions.invoke('analyze-outlook', {
        body: {
          ticker: stock.ticker,
          analysisType
        }
      });

      if (error) {
        console.error('Analysis error:', error);
        throw new Error(error.message || 'Failed to analyze outlook');
      }

      if (!data.success) {
        throw new Error(data.error || 'Analysis failed');
      }

      setAnalysis(data);
      
      // Open the appropriate modal
      if (isRisks) {
        setShowRisksModal(true);
      } else {
        setShowOpportunitiesModal(true);
      }
      
      toast({
        title: "Analysis Complete",
        description: `Future ${analysisType} analysis completed for ${stock.ticker}`,
      });
      
    } catch (error: any) {
      console.error('Error analyzing outlook:', error);
      const errorMessage = error.message || `Failed to analyze ${analysisType}. Please try again.`;
      toast({
        title: "Analysis Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatAnalysis = (analysisText: string) => {
    // Split by bullet points and format each one
    const bullets = analysisText.split('•').filter(bullet => bullet.trim());
    
    return bullets.map((bullet, index) => {
      const trimmed = bullet.trim();
      if (!trimmed) return null;
      
      // Check if it starts with **Title**: format
      const match = trimmed.match(/^\*\*(.*?)\*\*:\s*(.*)/);
      if (match) {
        const [, title, description] = match;
        return (
          <div key={index} className="mb-3 p-3 rounded border border-primary/20 bg-black/20 backdrop-blur-sm">
            <h4 className="font-semibold text-primary mb-2 flex items-start gap-2 text-sm font-mono uppercase tracking-wider">
              <div className="w-2 h-2 rounded-full bg-primary mt-1 flex-shrink-0" />
              {title}
            </h4>
            <p className="text-muted-foreground leading-relaxed ml-4 text-xs">{description}</p>
          </div>
        );
      }
      
      // Fallback: treat as regular bullet point
      return (
        <div key={index} className="mb-2 p-3 rounded border border-primary/10 bg-black/10 backdrop-blur-sm">
          <div className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-primary/60 mt-2 flex-shrink-0" />
            <p className="text-muted-foreground leading-relaxed text-xs">{trimmed}</p>
          </div>
        </div>
      );
    }).filter(Boolean);
  };

  const stock = stockData.stock_detail;
  const isPositive = stock.price_change >= 0;

  return (
    <Layout>
      <SEO title={`${stock.name} (${stock.ticker}) Stock Price, News & Filings | Vin Stock`} description={`Live ${stock.name} (${stock.ticker}) price, chart, news analysis, and SEC filings overview.`} canonical={`/stock/${stock.ticker}`} />
      <div className="container mx-auto px-4 py-6">

        {/* Sophisticated Header Section */}
        <StockHeaderCard stock={stock} />

        {/* Analysis Sections */}
        <div className="space-y-6 mb-6">
          <div className="p-6 bg-black/95 backdrop-blur-sm border border-primary/20 rounded-lg">
            <h2 className="text-lg font-mono text-primary/60 uppercase tracking-wider mb-4">Financial Overview</h2>
            <ELI5Financials ticker={stock.ticker} />
          </div>

          <div className="p-6 bg-black backdrop-blur-sm border border-primary/20 rounded-lg">
            <h2 className="text-lg font-mono text-primary/60 uppercase tracking-wider mb-4">Price Chart</h2>
            <div className="h-96 w-full mb-6">
              <TradingViewWidget ticker={stock.ticker} />
            </div>

            {/* Future Outlook Analysis Buttons */}
            <div className="pt-4 border-t border-primary/20">
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-mono text-primary uppercase tracking-wider">
                  Future Outlook • AI Analysis
                </h3>
                <div className="flex-1 h-px bg-gradient-to-r from-primary/50 to-transparent"></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Risks Column */}
                <div className="space-y-3">
                  <Button
                    onClick={() => handleAnalyze('risks')}
                    disabled={loadingRisks}
                    variant="ghost"
                    className="w-full h-auto p-4 flex flex-col items-start gap-3 bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 hover:border-red-500/50 transition-all duration-300"
                  >
                    <div className="flex items-center gap-2 w-full min-w-0">
                      {loadingRisks ? (
                        <Loader2 className="h-3 w-3 animate-spin text-red-400 flex-shrink-0" />
                      ) : (
                        <AlertTriangle className="h-3 w-3 text-red-400 flex-shrink-0" />
                      )}
                      <span className="font-mono text-xs uppercase tracking-wider text-red-400 truncate">
                        {loadingRisks ? 'Analyzing...' : 'Analyze Risks'}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground text-left font-mono leading-tight w-full break-words">
                      Identify future challenges
                    </span>
                  </Button>

                  {/* View Risks Analysis Button */}
                  {risksAnalysis && (
                    <Button
                      onClick={() => setShowRisksModal(true)}
                      variant="outline"
                      size="sm"
                      className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10 font-mono text-xs px-3 py-2"
                    >
                      <AlertTriangle className="h-3 w-3 mr-2 flex-shrink-0" />
                      <span className="truncate">View Analysis</span>
                    </Button>
                  )}
                </div>

                {/* Opportunities Column */}
                <div className="space-y-3">
                  <Button
                    onClick={() => handleAnalyze('opportunities')}
                    disabled={loadingOpportunities}
                    variant="ghost"
                    className="w-full h-auto p-4 flex flex-col items-start gap-3 bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 hover:border-emerald-500/50 transition-all duration-300"
                  >
                    <div className="flex items-center gap-2 w-full min-w-0">
                      {loadingOpportunities ? (
                        <Loader2 className="h-3 w-3 animate-spin text-emerald-400 flex-shrink-0" />
                      ) : (
                        <TrendingUp className="h-3 w-3 text-emerald-400 flex-shrink-0" />
                      )}
                      <span className="font-mono text-xs uppercase tracking-wider text-emerald-400 truncate">
                        {loadingOpportunities ? 'Analyzing...' : 'Analyze Opportunities'}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground text-left font-mono leading-tight w-full break-words">
                      Discover growth drivers
                    </span>
                  </Button>

                  {/* View Opportunities Analysis Button */}
                  {opportunitiesAnalysis && (
                    <Button
                      onClick={() => setShowOpportunitiesModal(true)}
                      variant="outline"
                      size="sm"
                      className="w-full border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 font-mono text-xs px-3 py-2"
                    >
                      <TrendingUp className="h-3 w-3 mr-2 flex-shrink-0" />
                      <span className="truncate">View Analysis</span>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>


          <div className="p-6 bg-black/95 backdrop-blur-sm border border-primary/20 rounded-lg">
            <h2 className="text-lg font-mono text-primary/60 uppercase tracking-wider mb-4">Competitor Analysis</h2>
            <CompetitorAnalysis 
              currentTicker={stock.ticker} 
              currentCompanyName={stock.name} 
            />
          </div>
        </div>

        {/* News & Filings Tabs */}
        <div className="mt-6">
          <div className="p-6 bg-black/95 backdrop-blur-sm border border-primary/20 rounded-lg">
            <Tabs defaultValue="news" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-primary/10 border border-primary/20">
                <TabsTrigger 
                  value="news" 
                  className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary font-mono"
                >
                  News & Analysis
                </TabsTrigger>
                <TabsTrigger 
                  value="filings" 
                  className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary font-mono"
                >
                  SEC Filings
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="news" className="mt-6">
                <div className="space-y-6">
                  <AINewsAnalysis 
                    ticker={stock.ticker} 
                    newsArticles={stockData.news || []} 
                  />
                  
                  <div>
                    <h3 className="text-lg font-mono text-primary/60 uppercase tracking-wider mb-4">Recent Headlines</h3>
                    {stockData.news && stockData.news.length > 0 ? (
                      <div className="space-y-2">
                        {stockData.news.map((article: any) => (
                          <div key={article.id} className="p-3 bg-primary/5 border border-primary/10 rounded-lg hover:bg-primary/10 transition-all group">
                            <a 
                              href={article.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="block"
                            >
                              <div className="flex items-start gap-3">
                                <div className="w-2 h-2 rounded-full bg-primary/60 mt-2 flex-shrink-0"></div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2 mb-2">
                                    {article.headline}
                                  </h4>
                                  {article.summary && (
                                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                                      {article.summary}
                                    </p>
                                  )}
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                                    <span className="font-medium">{article.source}</span>
                                    <span>•</span>
                                    <span>{new Date(article.published_at).toLocaleDateString()}</span>
                                  </div>
                                </div>
                              </div>
                            </a>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <div className="p-4 bg-primary/5 border border-primary/10 rounded-lg">
                          <p className="font-mono">No recent news available for {stock.ticker}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="filings" className="mt-6">
                <SECFilingAnalyzer ticker={stock.ticker} />
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Risks Analysis Modal */}
        <Dialog open={showRisksModal} onOpenChange={setShowRisksModal}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden bg-black/95 border-red-500/30">
            <DialogHeader className="border-b border-red-500/20 pb-4">
              <DialogTitle className="flex items-center gap-2 text-red-400 font-mono uppercase tracking-wider">
                <AlertTriangle className="h-5 w-5" />
                Potential Future Risks • {stock.ticker}
              </DialogTitle>
            </DialogHeader>
            <div className="overflow-y-auto pr-2 space-y-3">
              {risksAnalysis && formatAnalysis(risksAnalysis.analysis)}
              {risksAnalysis && (
                <div className="text-xs text-muted-foreground text-center pt-3 mt-4 border-t border-red-500/20 font-mono">
                  Analysis completed on {new Date(risksAnalysis.timestamp).toLocaleString()}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Opportunities Analysis Modal */}
        <Dialog open={showOpportunitiesModal} onOpenChange={setShowOpportunitiesModal}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden bg-black/95 border-emerald-500/30">
            <DialogHeader className="border-b border-emerald-500/20 pb-4">
              <DialogTitle className="flex items-center gap-2 text-emerald-400 font-mono uppercase tracking-wider">
                <TrendingUp className="h-5 w-5" />
                Potential Future Opportunities • {stock.ticker}
              </DialogTitle>
            </DialogHeader>
            <div className="overflow-y-auto pr-2 space-y-3">
              {opportunitiesAnalysis && formatAnalysis(opportunitiesAnalysis.analysis)}
              {opportunitiesAnalysis && (
                <div className="text-xs text-muted-foreground text-center pt-3 mt-4 border-t border-emerald-500/20 font-mono">
                  Analysis completed on {new Date(opportunitiesAnalysis.timestamp).toLocaleString()}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}