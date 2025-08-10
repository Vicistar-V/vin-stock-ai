import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileText, TrendingUp, Users, DollarSign, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SECFilingAnalyzerProps {
  ticker: string;
}

interface AnalysisResult {
  section: string;
  content: string;
  loading: boolean;
  success?: boolean;
  error?: string;
}

const ANALYSIS_SECTIONS = [
  {
    id: "risk_factors",
    title: "Key Risk Factors",
    description: "Summarize the main risks the company faces",
    icon: TrendingUp,
    prompt: "risk factors"
  },
  {
    id: "management_discussion",
    title: "Management's Discussion",
    description: "Analyze management's view on performance and strategy",
    icon: Users,
    prompt: "management discussion"
  },
  {
    id: "revenue_streams",
    title: "Revenue Analysis",
    description: "Explain the company's main revenue sources and growth",
    icon: DollarSign,
    prompt: "revenue streams"
  }
];

export function SECFilingAnalyzer({ ticker }: SECFilingAnalyzerProps) {
  const [analyses, setAnalyses] = useState<Record<string, AnalysisResult>>({});
  const [latestFiling, setLatestFiling] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState<typeof ANALYSIS_SECTIONS[0] | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleAnalyze = async (sectionId: string, prompt: string) => {
    console.log(`🔍 Starting analysis for ${sectionId}: ${prompt}`);
    
    const section = ANALYSIS_SECTIONS.find(s => s.id === sectionId);
    setSelectedSection(section || null);
    
    setAnalyses(prev => ({
      ...prev,
      [sectionId]: { 
        section: sectionId, 
        content: "", 
        loading: true,
        success: false,
        error: undefined
      }
    }));

    try {
      console.log(`📡 Calling Supabase function with:`, { ticker, section: prompt });
      
      const { data, error } = await supabase.functions.invoke('sec-filing-analyzer', {
        body: { ticker, section: prompt }
      });

      console.log(`📥 Response received:`, { data, error });

      if (error) {
        console.error('❌ Supabase function error:', error);
        throw new Error(error.message || 'Function call failed');
      }

      if (!data) {
        throw new Error('No data received from analysis');
      }

      // Handle the response data
      const analysisContent = data.analysis || 'No analysis content received';
      const isSuccess = data.success !== false;

      setAnalyses(prev => ({
        ...prev,
        [sectionId]: {
          section: sectionId,
          content: analysisContent,
          loading: false,
          success: isSuccess,
          error: data.error || undefined
        }
      }));

      if (data.filingTitle && !latestFiling) {
        setLatestFiling(data.filingTitle);
      }

      // Open modal when analysis is complete
      setIsModalOpen(true);

      console.log(`✅ Analysis completed for ${sectionId}`);

    } catch (error) {
      console.error('❌ Error analyzing filing:', error);
      
      setAnalyses(prev => ({
        ...prev,
        [sectionId]: {
          section: sectionId,
          content: `Sorry, I couldn't analyze this section right now. 

Error: ${error.message}

Please try again in a moment. If the problem persists, the SEC filing may be temporarily inaccessible.`,
          loading: false,
          success: false,
          error: error.message
        }
      }));
      
      // Still open modal to show error
      setIsModalOpen(true);
    }
  };

  const AnalysisModal = () => {
    const analysis = selectedSection ? analyses[selectedSection.id] : null;
    
    return (
      <DialogContent className="max-w-4xl w-full h-[85vh] flex flex-col bg-black/95 border-primary/30">
        <DialogHeader className="flex-shrink-0 border-b border-primary/20 pb-4">
          <DialogTitle className="flex items-center gap-3 text-xl font-mono text-primary">
            <FileText className="h-5 w-5" />
            SEC Filing Analysis • {selectedSection?.title}
          </DialogTitle>
          <p className="text-sm text-muted-foreground font-mono">
            {latestFiling || `Latest 10-K/10-Q Report for ${ticker}`}
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 scrollbar-thin scrollbar-track-black/20 scrollbar-thumb-primary/30 hover:scrollbar-thumb-primary/50">
          {analysis && (
            <>
              {/* Analysis Status */}
              <div className="text-center space-y-3">
                <div className={`inline-flex items-center gap-3 px-6 py-3 rounded-lg border ${
                  analysis.success 
                    ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
                    : 'text-red-400 border-red-500/30 bg-red-500/10'
                }`}>
                  {analysis.success ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <AlertCircle className="h-5 w-5" />
                  )}
                  <div>
                    <div className="text-sm font-bold">
                      {analysis.success ? 'Analysis Complete' : 'Analysis Error'}
                    </div>
                    <div className="text-xs font-mono">
                      {selectedSection?.description}
                    </div>
                  </div>
                </div>
              </div>

              {/* Analysis Content */}
              <div className="space-y-4">
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-6">
                  <div className="text-sm text-foreground/90 leading-relaxed">
                    {analysis.content.split('\n').map((paragraph, idx) => {
                      if (!paragraph.trim()) return null;
                      
                      // Handle section headers (lines that end with colon)
                      if (paragraph.trim().endsWith(':') && paragraph.trim().length < 80) {
                        return (
                          <h4 key={idx} className="font-semibold text-primary mt-4 mb-2 first:mt-0">
                            {paragraph.trim()}
                          </h4>
                        );
                      }
                      
                      // Handle bullet points with better styling
                      if (paragraph.trim().startsWith('•') || paragraph.trim().startsWith('-')) {
                        return (
                          <div key={idx} className="flex items-start gap-3 mb-2 ml-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                            <span className="leading-relaxed">
                              {paragraph.trim().replace(/^[•-]\s*/, '')}
                            </span>
                          </div>
                        );
                      }
                      
                      // Handle numbered lists with enhanced styling
                      if (/^\d+\./.test(paragraph.trim())) {
                        const number = paragraph.trim().match(/^\d+\./)?.[0];
                        const content = paragraph.trim().replace(/^\d+\.\s*/, '');
                        return (
                          <div key={idx} className="flex items-start gap-3 mb-3 ml-2">
                            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-semibold flex-shrink-0">
                              {number?.replace('.', '')}
                            </div>
                            <span className="leading-relaxed font-medium">
                              {content}
                            </span>
                          </div>
                        );
                      }
                      
                      // Regular paragraphs with better spacing
                      return (
                        <p key={idx} className="mb-3 last:mb-0 leading-relaxed">
                          {paragraph.trim()}
                        </p>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Disclaimer */}
              <div className="text-xs text-muted-foreground text-center pt-4 border-t border-primary/20 font-mono">
                AI analysis of SEC filings • Not financial advice • Based on latest available data
              </div>
            </>
          )}
        </div>
      </DialogContent>
    );
  };

  return (
    <div className="space-y-6">
      {/* Filing Header */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">SEC Filing Analysis</CardTitle>
          </div>
          <div className="text-sm text-muted-foreground">
            {latestFiling ? (
              <span className="font-medium">{latestFiling}</span>
            ) : (
              <span>Latest 10-K/10-Q Report for {ticker}</span>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Analysis Buttons */}
      <div className="grid gap-4 md:grid-cols-3">
        {ANALYSIS_SECTIONS.map((section) => {
          const IconComponent = section.icon;
          const analysis = analyses[section.id];
          
          return (
            <Card key={section.id} className="relative">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2 mb-2">
                  <IconComponent className="h-4 w-4 text-primary" />
                  <span className="font-medium text-sm">{section.title}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {section.description}
                </p>
              </CardHeader>
              {analysis?.loading && (
                <div className="absolute inset-0 z-10 bg-background/60 backdrop-blur-sm flex items-center justify-center">
                  <div className="flex items-center gap-2 rounded border bg-card px-3 py-1.5 shadow-sm">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    <span className="text-sm">Analyzing…</span>
                  </div>
                </div>
              )}
              <CardContent className="pt-0">
                <Button
                  onClick={() => handleAnalyze(section.id, section.prompt)}
                  disabled={analysis?.loading}
                  className="w-full mb-4 overflow-hidden text-ellipsis whitespace-nowrap min-h-[40px] flex items-center justify-center gap-2"
                  variant={analysis?.content ? "secondary" : "default"}
                >
                  {analysis?.loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
                      <span className="truncate">Analyzing...</span>
                    </>
                  ) : analysis?.content ? (
                    <>
                      {analysis.success ? (
                        <CheckCircle className="h-4 w-4 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="h-4 w-4 flex-shrink-0" />
                      )}
                      <span className="truncate">Re-analyze</span>
                    </>
                  ) : (
                    <span className="truncate">{`Analyze ${section.title}`}</span>
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Analysis Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <AnalysisModal />
      </Dialog>

      {/* Instructions */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-sm text-muted-foreground">
            <p className="mb-2">
              <strong>Vin Stock AI</strong> analyzes the latest SEC filings to give you key insights
            </p>
            <p>
              Click any button above to get an AI-powered summary of that section from {ticker}'s most recent report
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}