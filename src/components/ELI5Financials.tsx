import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Bot, AlertCircle, Brain, TrendingUp, TrendingDown, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface MetricItem {
  key: string;
  label: string;
  value: string; // formatted value
  raw: number;   // raw numeric value
}

export default function ELI5Financials({ ticker }: { ticker: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<MetricItem[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<MetricItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [explaining, setExplaining] = useState<Record<string, boolean>>({});
  const [explanations, setExplanations] = useState<Record<string, string>>({});
  const [shaking, setShaking] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    supabase.functions.invoke('financial-metrics', { body: { ticker } })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || 'Failed to load metrics');
        setMetrics((data.metrics || []) as MetricItem[]);
      })
      .catch((e) => setError(e.message))
      .finally(() => active && setLoading(false));

    return () => { active = false };
  }, [ticker]);

  // Random shake animation for each button
  useEffect(() => {
    if (metrics.length === 0) return;
    
    const intervals: NodeJS.Timeout[] = [];
    
    metrics.forEach((metric) => {
      const startRandomShakes = () => {
        const interval = setInterval(() => {
          // Random delay between 3-6 seconds
          const delay = Math.random() * 3000 + 3000;
          setTimeout(() => {
            setShaking(prev => ({ ...prev, [metric.key]: true }));
            // Stop shaking after animation duration (500ms)
            setTimeout(() => {
              setShaking(prev => ({ ...prev, [metric.key]: false }));
            }, 500);
          }, delay);
        }, 6000); // Check every 6 seconds for new shake
        
        intervals.push(interval);
      };
      
      startRandomShakes();
    });
    
    return () => {
      intervals.forEach(clearInterval);
    };
  }, [metrics]);

  const gridCols = useMemo(() => (metrics.length > 0 ? "md:grid-cols-3" : ""), [metrics.length]);

  const onExplain = async (m: MetricItem) => {
    setSelectedMetric(m);
    setIsModalOpen(true);
    
    if (!explanations[m.key] && !explaining[m.key]) {
      setExplaining((s) => ({ ...s, [m.key]: true }));
      try {
        const { data, error } = await supabase.functions.invoke('explain-metric', {
          body: { ticker, metricName: m.label, metricValue: m.value },
        });
        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || 'Failed to explain metric');
        setExplanations((s) => ({ ...s, [m.key]: data.explanation }));
      } catch (e: any) {
        setExplanations((s) => ({ ...s, [m.key]: `I couldn't explain this right now. Please try again.\n\nError: ${e.message}` }));
      } finally {
        setExplaining((s) => ({ ...s, [m.key]: false }));
      }
    }
  };

  const ExplanationModal = () => (
    <DialogContent className="max-w-2xl w-full bg-black/95 border-primary/30">
      <DialogHeader className="border-b border-primary/20 pb-4">
        <DialogTitle className="flex items-center gap-3 text-lg font-mono text-primary">
          <Brain className="h-5 w-5" />
          ELI5 Financial Metric • {selectedMetric?.label}
        </DialogTitle>
        <p className="text-sm text-muted-foreground font-mono">
          Simple explanation • Current value: {selectedMetric?.value}
        </p>
      </DialogHeader>

      <div className="py-6 space-y-4 scrollbar-thin scrollbar-track-black/20 scrollbar-thumb-primary/30 hover:scrollbar-thumb-primary/50">
        {selectedMetric && (
          <>
            {/* Metric Display */}
            <div className="text-center space-y-2">
              <div className="text-3xl font-bold text-primary font-mono">
                {selectedMetric.value}
              </div>
              <div className="text-sm text-muted-foreground uppercase tracking-wider">
                {selectedMetric.label}
              </div>
            </div>

            {/* Explanation Content */}
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-6">
              {explaining[selectedMetric.key] ? (
                <div className="text-center space-y-4">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                  <div className="space-y-2">
                    <h3 className="text-lg font-mono text-primary">Generating Explanation</h3>
                    <p className="text-sm text-muted-foreground font-mono">Breaking down the numbers...</p>
                  </div>
                </div>
              ) : explanations[selectedMetric.key] ? (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-primary flex items-center gap-2">
                    <Bot className="h-4 w-4" />
                    Simple Explanation
                  </h3>
                  <div className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
                    {explanations[selectedMetric.key]}
                  </div>
                </div>
              ) : (
                <div className="text-center text-muted-foreground">
                  <Bot className="h-8 w-8 mx-auto mb-2 text-primary/60" />
                  <p className="text-sm">AI explanation will appear here...</p>
                </div>
              )}
            </div>

            {/* Disclaimer */}
            <div className="text-xs text-muted-foreground text-center pt-4 border-t border-primary/20 font-mono">
              AI-generated explanation • For educational purposes • Not financial advice
            </div>
          </>
        )}
      </div>
    </DialogContent>
  );

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
            KEY METRICS • ELI5
          </h3>
          <div className="flex-1 h-px bg-gradient-to-r from-primary/50 to-transparent"></div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground p-4">
            <Loader2 className="h-4 w-4 animate-spin" /> 
            <span className="text-xs font-mono">Loading financial metrics…</span>
          </div>
        ) : error ? (
          <Alert variant="destructive" className="border-red-500/30 bg-red-500/5">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
        ) : metrics.length === 0 ? (
          <div className="text-xs text-muted-foreground font-mono p-4">
            No financial metrics available for {ticker}.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {metrics.map((m) => {
              const isNegative = m.raw < 0;
              const isHigh = m.raw > 50; // Simple threshold for demo
              
              return (
                <div 
                  key={m.key} 
                  className="group relative overflow-hidden rounded border border-primary/20 bg-black/50 backdrop-blur-sm p-3 hover:border-primary/40 transition-all duration-300"
                >
                  {/* Subtle gradient overlay */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${
                    isNegative ? 'from-red-500/5 to-transparent' : 
                    isHigh ? 'from-emerald-500/5 to-transparent' : 
                    'from-primary/5 to-transparent'
                  } opacity-0 group-hover:opacity-100 transition-opacity`}></div>
                  
                  <div className="relative flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-muted-foreground font-mono uppercase tracking-wide mb-1">
                        {m.label}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-lg font-bold text-primary font-mono">
                          {m.value}
                        </div>
                        {isNegative ? (
                          <TrendingDown className="h-3 w-3 text-red-400" />
                        ) : isHigh ? (
                          <TrendingUp className="h-3 w-3 text-emerald-400" />
                        ) : (
                          <Activity className="h-3 w-3 text-primary/60" />
                        )}
                      </div>
                    </div>

                    <Button 
                      size="sm" 
                      variant="ghost"
                      className={`h-7 w-7 shrink-0 bg-primary/10 border border-primary/30 hover:bg-primary/20 hover:border-primary/50 transition-all duration-300 ${
                        shaking[m.key] ? 'animate-pulse' : ''
                      } group-hover:scale-110`}
                      aria-label={`Explain ${m.label}`}
                      onClick={() => onExplain(m)}
                    >
                      {explaining[m.key] ? (
                        <Loader2 className="h-3 w-3 animate-spin text-primary" />
                      ) : (
                        <Bot className="h-3 w-3 text-primary" />
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Explanation Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <ExplanationModal />
      </Dialog>
    </div>
  );
}