import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TrendingUp, TrendingDown, AlertTriangle, Lightbulb, Loader2, Brain, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface FutureOutlookAnalysisProps {
  ticker: string;
}

interface AnalysisResult {
  analysis: string;
  analysisType: string;
  ticker: string;
  companyName: string;
  timestamp: string;
}

export function FutureOutlookAnalysis({ ticker }: FutureOutlookAnalysisProps) {
  const [risksAnalysis, setRisksAnalysis] = useState<AnalysisResult | null>(null);
  const [opportunitiesAnalysis, setOpportunitiesAnalysis] = useState<AnalysisResult | null>(null);
  const [loadingRisks, setLoadingRisks] = useState(false);
  const [loadingOpportunities, setLoadingOpportunities] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRisksModal, setShowRisksModal] = useState(false);
  const [showOpportunitiesModal, setShowOpportunitiesModal] = useState(false);
  const { toast } = useToast();

  const handleAnalyze = async (analysisType: 'risks' | 'opportunities') => {
    const isRisks = analysisType === 'risks';
    const setLoading = isRisks ? setLoadingRisks : setLoadingOpportunities;
    const setAnalysis = isRisks ? setRisksAnalysis : setOpportunitiesAnalysis;
    
    setLoading(true);
    setError(null);
    
    try {
      console.log(`🔍 Starting ${analysisType} analysis for ${ticker}`);
      
      const { data, error } = await supabase.functions.invoke('analyze-outlook', {
        body: {
          ticker,
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
        description: `Future ${analysisType} analysis completed for ${ticker}`,
      });
      
    } catch (error: any) {
      console.error('Error analyzing outlook:', error);
      const errorMessage = error.message || `Failed to analyze ${analysisType}. Please try again.`;
      setError(errorMessage);
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

  return (
    <div className="relative">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 rounded-lg"></div>
      <div className="absolute inset-0 border border-primary/30 rounded-lg shadow-lg shadow-primary/5"></div>
      
      <div className="relative p-4">
        {/* Compact Header */}
        <div className="flex items-center gap-2 mb-4">
          <Brain className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-mono text-primary uppercase tracking-wider">
            FUTURE OUTLOOK • AI ANALYSIS
          </h3>
          <div className="flex-1 h-px bg-gradient-to-r from-primary/50 to-transparent"></div>
        </div>

        {/* Analysis Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          <Button
            onClick={() => handleAnalyze('risks')}
            disabled={loadingRisks}
            variant="ghost"
            className="h-auto p-3 flex flex-col items-start gap-2 bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 hover:border-red-500/50 transition-all duration-300"
          >
            <div className="flex items-center gap-2 w-full">
              {loadingRisks ? (
                <Loader2 className="h-3 w-3 animate-spin text-red-400" />
              ) : (
                <AlertTriangle className="h-3 w-3 text-red-400" />
              )}
              <span className="font-mono text-xs uppercase tracking-wider text-red-400">
                {loadingRisks ? 'Analyzing Risks...' : 'Analyze Risks'}
              </span>
            </div>
            <span className="text-xs text-muted-foreground text-left font-mono">
              Identify future challenges and threats
            </span>
          </Button>

          <Button
            onClick={() => handleAnalyze('opportunities')}
            disabled={loadingOpportunities}
            variant="ghost"
            className="h-auto p-3 flex flex-col items-start gap-2 bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 hover:border-emerald-500/50 transition-all duration-300"
          >
            <div className="flex items-center gap-2 w-full">
              {loadingOpportunities ? (
                <Loader2 className="h-3 w-3 animate-spin text-emerald-400" />
              ) : (
                <TrendingUp className="h-3 w-3 text-emerald-400" />
              )}
              <span className="font-mono text-xs uppercase tracking-wider text-emerald-400">
                {loadingOpportunities ? 'Analyzing Opportunities...' : 'Analyze Opportunities'}
              </span>
            </div>
            <span className="text-xs text-muted-foreground text-left font-mono">
              Discover future growth drivers and catalysts
            </span>
          </Button>
        </div>

        {/* Add buttons to reopen modals if analysis exists */}
        {(risksAnalysis || opportunitiesAnalysis) && (
          <div className="flex gap-2 mb-4">
            {risksAnalysis && (
              <Button
                onClick={() => setShowRisksModal(true)}
                variant="outline"
                size="sm"
                className="border-red-500/30 text-red-400 hover:bg-red-500/10"
              >
                <AlertTriangle className="h-3 w-3 mr-1" />
                View Risks Analysis
              </Button>
            )}
            {opportunitiesAnalysis && (
              <Button
                onClick={() => setShowOpportunitiesModal(true)}
                variant="outline"
                size="sm"
                className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
              >
                <TrendingUp className="h-3 w-3 mr-1" />
                View Opportunities Analysis
              </Button>
            )}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <Alert variant="destructive" className="border-red-500/30 bg-red-500/5 mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
        )}

        {/* Instructions */}
        {!risksAnalysis && !opportunitiesAnalysis && (
          <div className="text-center py-6 text-muted-foreground">
            <div className="space-y-2">
              <Lightbulb className="h-6 w-6 mx-auto opacity-50 text-primary" />
              <p className="text-xs font-mono">
                Click either button above to generate AI-powered insights about {ticker}'s future outlook
              </p>
              <p className="text-xs font-mono opacity-60">
                Analysis combines recent news, company data, and market context
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Risks Analysis Modal */}
      <Dialog open={showRisksModal} onOpenChange={setShowRisksModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden bg-black/95 border-red-500/30">
          <DialogHeader className="border-b border-red-500/20 pb-4">
            <DialogTitle className="flex items-center gap-2 text-red-400 font-mono uppercase tracking-wider">
              <AlertTriangle className="h-5 w-5" />
              Potential Future Risks • {ticker}
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto pr-2 space-y-3 scrollbar-thin scrollbar-track-black/20 scrollbar-thumb-primary/30 hover:scrollbar-thumb-primary/50">
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
              Potential Future Opportunities • {ticker}
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto pr-2 space-y-3 scrollbar-thin scrollbar-track-black/20 scrollbar-thumb-primary/30 hover:scrollbar-thumb-primary/50">
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
  );
}