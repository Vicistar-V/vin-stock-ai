import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, BarChart3, TrendingUp, Loader2, Monitor, Heart, Building2, Zap, Car, Film, Activity, Clock, Brain, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import SEO from "@/components/SEO";
import Layout from "@/components/Layout";

interface SectorAnalysis {
  sector: string;
  mood_and_trends: string;
  major_players: string;
  emerging_stories: string[];
  timestamp: string;
}

const sectors = [
  { 
    id: 'technology', 
    name: 'Technology', 
    icon: Monitor,
    description: 'Software, hardware, semiconductors, and tech services',
    stocks: ['AAPL', 'MSFT', 'GOOGL', 'NVDA', 'META'],
    color: 'blue'
  },
  { 
    id: 'healthcare', 
    name: 'Healthcare', 
    icon: Heart,
    description: 'Pharmaceuticals, biotech, medical devices, and services',
    stocks: ['JNJ', 'PFE', 'UNH', 'ABBV', 'LLY'],
    color: 'red'
  },
  { 
    id: 'financial', 
    name: 'Financial Services', 
    icon: Building2,
    description: 'Banks, insurance, investment services, and fintech',
    stocks: ['JPM', 'BAC', 'WFC', 'C', 'GS'],
    color: 'green'
  },
  { 
    id: 'energy', 
    name: 'Energy', 
    icon: Zap,
    description: 'Oil, gas, renewable energy, and utilities',
    stocks: ['XOM', 'CVX', 'COP', 'EOG', 'SLB'],
    color: 'yellow'
  },
  { 
    id: 'consumer', 
    name: 'Consumer Cyclical', 
    icon: Car,
    description: 'Retail, automotive, leisure, and discretionary spending',
    stocks: ['TSLA', 'AMZN', 'HD', 'NKE', 'SBUX'],
    color: 'purple'
  },
  { 
    id: 'entertainment', 
    name: 'Entertainment & Media', 
    icon: Film,
    description: 'Streaming, media, gaming, and entertainment services',
    stocks: ['NFLX', 'DIS', 'WBD', 'PARA', 'EA'],
    color: 'orange'
  }
];

const SectorPulsePage = () => {
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<SectorAnalysis | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSectorClick = async (sectorId: string) => {
    const sector = sectors.find(s => s.id === sectorId);
    if (!sector) return;

    setSelectedSector(sectorId);
    setLoading(true);
    setAnalysis(null);

    try {
      const { data, error } = await supabase.functions.invoke('sector-pulse', {
        body: { 
          sector: sector.name,
          tickers: sector.stocks 
        }
      });

      if (error) throw error;

      setAnalysis(data);
      toast.success(`Analysis complete for ${sector.name} sector`);
    } catch (error) {
      console.error('Error fetching sector analysis:', error);
      toast.error('Failed to generate sector analysis. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToSectors = () => {
    setSelectedSector(null);
    setAnalysis(null);
  };

  const getColorClass = (color: string) => {
    const colors = {
      blue: 'from-blue-500/20 to-blue-600/10 border-blue-500/30 text-blue-400',
      red: 'from-red-500/20 to-red-600/10 border-red-500/30 text-red-400',
      green: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30 text-emerald-400',
      yellow: 'from-yellow-500/20 to-yellow-600/10 border-yellow-500/30 text-yellow-400',
      purple: 'from-purple-500/20 to-purple-600/10 border-purple-500/30 text-purple-400',
      orange: 'from-orange-500/20 to-orange-600/10 border-orange-500/30 text-orange-400'
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  return (
    <Layout>
      <SEO 
        title="AI Sector Pulse — Industry Analysis & Market Intelligence | Vin Stock" 
        description="AI-powered sector analysis providing comprehensive insights into major industries, trends, and market movements." 
        canonical="/sector-pulse" 
      />
      
      <div className="min-h-screen bg-black/98 backdrop-blur-sm">
        {!selectedSector ? (
          <div className="container mx-auto px-4 py-8">
            {/* Header Section */}
            <div className="relative mb-12">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 rounded-lg"></div>
              <div className="relative p-8 border border-primary/20 rounded-lg backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-6">
                  <Activity className="h-6 w-6 text-primary animate-pulse" />
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-mono text-primary uppercase tracking-wider">Sector Pulse</span>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                      <span className="text-xs text-primary/80">LIVE</span>
                    </div>
                  </div>
                </div>
                
                <h1 className="text-4xl font-bold text-foreground mb-4">
                  AI-Powered Industry Intelligence
                </h1>
                <p className="text-lg text-muted-foreground max-w-3xl leading-relaxed">
                  Deep sector analysis combining market data, news sentiment, and AI insights. 
                  Monitor trends, major player movements, and emerging stories across entire industries.
                </p>
                
                <div className="flex items-center gap-2 mt-6 text-xs text-muted-foreground font-mono">
                  <Clock className="h-3 w-3" />
                  <span>
                    {new Date().toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      timeZone: 'America/New_York'
                    })} EST
                  </span>
                  <span className="mx-2">•</span>
                  <span>Real-time sector monitoring</span>
                </div>
              </div>
            </div>

            {/* Sector Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
              {sectors.map((sector) => (
                <div 
                  key={sector.id}
                  className={`group relative overflow-hidden rounded-lg border bg-gradient-to-br ${getColorClass(sector.color)} 
                    hover:scale-105 transition-all duration-300 cursor-pointer`}
                  onClick={() => handleSectorClick(sector.id)}
                >
                  {/* Background gradient overlay */}
                  <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
                  
                  <div className="relative p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${getColorClass(sector.color)} 
                          flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                          <sector.icon className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                            {sector.name}
                          </h3>
                          <div className="text-xs text-muted-foreground font-mono uppercase tracking-wider">
                            {sector.stocks.length} Major Players
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </div>
                    
                    <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                      {sector.description}
                    </p>
                    
                    {/* Stock badges */}
                    <div className="flex flex-wrap gap-1">
                      {sector.stocks.slice(0, 4).map((stock) => (
                        <Badge 
                          key={stock} 
                          variant="outline" 
                          className="text-xs bg-black/30 border-primary/20 text-primary/80 hover:bg-primary/10 transition-colors"
                        >
                          {stock}
                        </Badge>
                      ))}
                      {sector.stocks.length > 4 && (
                        <Badge 
                          variant="outline" 
                          className="text-xs bg-primary/10 border-primary/30 text-primary"
                        >
                          +{sector.stocks.length - 4}
                        </Badge>
                      )}
                    </div>
                    
                    {/* Hover indicator */}
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent 
                      opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="container mx-auto px-4 py-8">
            {/* Analysis Header */}
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 rounded-lg"></div>
              <div className="relative p-6 border border-primary/20 rounded-lg backdrop-blur-sm">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <Button
                      onClick={handleBackToSectors}
                      variant="ghost"
                      className="bg-primary/10 border border-primary/30 hover:bg-primary/20 hover:border-primary/50"
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      <span className="font-mono text-sm">Back to Sectors</span>
                    </Button>
                    <div className="h-8 w-px bg-primary/30"></div>
                    <div className="flex items-center gap-3">
                      <Brain className="h-5 w-5 text-primary animate-pulse" />
                      <span className="text-sm font-mono text-primary uppercase tracking-wider">AI Analysis</span>
                    </div>
                  </div>
                </div>
                
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  {sectors.find(s => s.id === selectedSector)?.name} Sector Intelligence
                </h1>
                <p className="text-muted-foreground font-mono text-sm">
                  Real-time AI-powered sector analysis • Market trends • Major player movements
                </p>
              </div>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="relative py-16">
                <div className="absolute inset-0 bg-black/95 backdrop-blur-md rounded-lg border border-primary/30 flex items-center justify-center">
                  <div className="text-center space-y-6">
                    <Brain className="h-12 w-12 text-primary animate-pulse mx-auto" />
                    <div className="space-y-2">
                      <h3 className="text-lg font-mono text-primary">Analyzing Sector Data</h3>
                      <p className="text-sm text-muted-foreground font-mono">Processing market trends and news sentiment...</p>
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

            {/* Analysis Results */}
            {analysis && (
              <div className="space-y-6 max-w-6xl mx-auto">
                {/* Overall Mood & Trends */}
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-emerald-500/10 rounded-lg"></div>
                  <div className="relative p-6 border border-emerald-500/20 rounded-lg backdrop-blur-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <TrendingUp className="h-5 w-5 text-emerald-400" />
                      <h3 className="text-lg font-mono text-emerald-400 uppercase tracking-wider">Market Sentiment</h3>
                      <div className="flex-1 h-px bg-gradient-to-r from-emerald-500/50 to-transparent"></div>
                    </div>
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
                      <p className="text-foreground/90 leading-relaxed">{analysis.mood_and_trends}</p>
                    </div>
                  </div>
                </div>

                {/* Major Players */}
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-blue-500/10 rounded-lg"></div>
                  <div className="relative p-6 border border-blue-500/20 rounded-lg backdrop-blur-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <BarChart3 className="h-5 w-5 text-blue-400" />
                      <h3 className="text-lg font-mono text-blue-400 uppercase tracking-wider">Key Players</h3>
                      <div className="flex-1 h-px bg-gradient-to-r from-blue-500/50 to-transparent"></div>
                    </div>
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                      <p className="text-foreground/90 leading-relaxed">{analysis.major_players}</p>
                    </div>
                  </div>
                </div>

                {/* Emerging Stories */}
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-purple-500/10 rounded-lg"></div>
                  <div className="relative p-6 border border-purple-500/20 rounded-lg backdrop-blur-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <Activity className="h-5 w-5 text-purple-400" />
                      <h3 className="text-lg font-mono text-purple-400 uppercase tracking-wider">Emerging Developments</h3>
                      <div className="flex-1 h-px bg-gradient-to-r from-purple-500/50 to-transparent"></div>
                    </div>
                    <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4 space-y-3">
                      {analysis.emerging_stories.map((story, index) => (
                        <div key={index} className="flex items-start gap-3 p-3 rounded bg-black/20 border border-purple-500/10">
                          <div className="w-2 h-2 bg-purple-400 rounded-full mt-2 flex-shrink-0"></div>
                          <span className="text-foreground/90 leading-relaxed text-sm">{story}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Analysis Footer */}
                <div className="text-center py-6 border-t border-primary/20">
                  <div className="text-xs text-muted-foreground font-mono space-y-1">
                    <div className="flex items-center justify-center gap-2">
                      <Clock className="h-3 w-3" />
                      <span>Analysis generated on {new Date(analysis.timestamp).toLocaleString()}</span>
                    </div>
                    <div>AI-powered sector intelligence • Not financial advice • For educational purposes</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default SectorPulsePage;