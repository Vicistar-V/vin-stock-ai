import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Brain, TrendingUp, TrendingDown, AlertCircle, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface NewsArticle {
  headline: string;
  summary?: string;
  url?: string;
  source?: string;
}

interface AIAnalysis {
  summary: string;
  sentiment_score: number;
  sentiment_justification: string;
  key_positive_highlight: string;
  key_negative_highlight: string;
  market_impact: string;
  ticker: string;
  articles_analyzed: number;
  analysis_timestamp: string;
  analyst: string;
}

interface AINewsAnalysisProps {
  ticker: string;
  newsArticles: NewsArticle[];
}

export function AINewsAnalysis({ ticker, newsArticles }: AINewsAnalysisProps) {
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { toast } = useToast();

  const getSentimentColor = (score: number) => {
    if (score >= 7) return "text-emerald-400 border-emerald-500/30 bg-emerald-500/10";
    if (score >= 4) return "text-yellow-400 border-yellow-500/30 bg-yellow-500/10";
    return "text-red-400 border-red-500/30 bg-red-500/10";
  };

  const getSentimentIcon = (score: number) => {
    if (score >= 7) return <TrendingUp className="w-4 h-4" />;
    if (score >= 4) return <AlertCircle className="w-4 h-4" />;
    return <TrendingDown className="w-4 h-4" />;
  };

  const handleAnalyzeNews = async () => {
    if (!newsArticles || newsArticles.length === 0) {
      toast({
        title: "No News Available",
        description: "There are no recent news articles to analyze for this stock.",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-news', {
        body: {
          ticker,
          news_articles: newsArticles.slice(0, 10) // Analyze latest 10 articles
        }
      });

      if (error) {
        console.error('Analysis error:', error);
        throw new Error(error.message || 'Failed to analyze news');
      }

      setAnalysis(data);
      setIsModalOpen(true); // Open modal when analysis is complete
      toast({
        title: "Analysis Complete",
        description: `AI analyzed ${data.articles_analyzed} recent articles.`,
      });
    } catch (error) {
      console.error('Error analyzing news:', error);
      toast({
        title: "Analysis Failed",
        description: "Unable to analyze news at this time. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const AnalysisModal = () => (
    <DialogContent className="max-w-4xl w-full h-[85vh] flex flex-col bg-black/95 border-primary/30">
      <DialogHeader className="flex-shrink-0 border-b border-primary/20 pb-4">
        <DialogTitle className="flex items-center gap-3 text-xl font-mono text-primary">
          <Brain className="h-5 w-5" />
          AI News Analysis • {ticker}
        </DialogTitle>
        <p className="text-sm text-muted-foreground font-mono">
          Sentiment Analysis • Market Impact • Key Insights
        </p>
      </DialogHeader>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 scrollbar-thin scrollbar-track-black/20 scrollbar-thumb-primary/30 hover:scrollbar-thumb-primary/50">
        {analysis && (
          <>
            {/* Sentiment Score Header */}
            <div className="text-center space-y-3">
              <div className={`inline-flex items-center gap-3 px-6 py-3 rounded-lg border ${getSentimentColor(analysis.sentiment_score)}`}>
                {getSentimentIcon(analysis.sentiment_score)}
                <div>
                  <div className="text-2xl font-bold">{analysis.sentiment_score}/10</div>
                  <div className="text-sm font-mono">{analysis.sentiment_justification}</div>
                </div>
              </div>
              <div className="text-xs text-muted-foreground font-mono">
                Analyzed {analysis.articles_analyzed} articles • {new Date(analysis.analysis_timestamp).toLocaleString()}
              </div>
            </div>

            {/* Overall Summary */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-primary flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Market Summary
              </h3>
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                <p className="text-sm text-foreground/90 leading-relaxed">{analysis.summary}</p>
              </div>
            </div>

            {/* Key Highlights */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium text-emerald-400 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Positive Highlights
                </h4>
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <p className="text-sm text-foreground/90">{analysis.key_positive_highlight}</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium text-red-400 flex items-center gap-2">
                  <TrendingDown className="w-4 h-4" />
                  Key Concerns
                </h4>
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <p className="text-sm text-foreground/90">{analysis.key_negative_highlight}</p>
                </div>
              </div>
            </div>

            {/* Market Impact */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-purple-400 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Market Impact Assessment
              </h3>
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
                <p className="text-sm text-foreground/90 leading-relaxed">{analysis.market_impact}</p>
              </div>
            </div>

            {/* Disclaimer */}
            <div className="text-xs text-muted-foreground text-center pt-4 border-t border-primary/20 font-mono">
              AI-powered sentiment analysis • Not financial advice • Based on recent news articles
            </div>
          </>
        )}
      </div>
    </DialogContent>
  );

  return (
    <div className="space-y-4">
      {/* Trigger Button */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Latest News & AI Analysis</h3>
        <Button
          onClick={handleAnalyzeNews}
          disabled={isAnalyzing || !newsArticles?.length}
          variant="default"
          className="font-medium"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Analyzing News...
            </>
          ) : (
            <>
              <Brain className="w-4 h-4 mr-2" />
              Analyze News with AI
            </>
          )}
        </Button>
      </div>

      {/* Loading State */}
      {isAnalyzing && (
        <div className="relative py-12">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-md rounded-lg border border-primary/30 flex items-center justify-center">
            <div className="text-center space-y-4">
              <Brain className="h-10 w-10 text-primary animate-pulse mx-auto" />
              <div className="space-y-2">
                <h3 className="text-lg font-mono text-primary">Analyzing News Articles</h3>
                <p className="text-sm text-muted-foreground font-mono">Processing sentiment and market impact...</p>
              </div>
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

      {/* Analysis Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <AnalysisModal />
      </Dialog>
    </div>
  );
}