import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, BarChart3, TrendingUp, Loader2, PieChart, Target, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import SEO from "@/components/SEO";
import Layout from "@/components/Layout";
import { PieChart as RechartsPieChart, Cell, ResponsiveContainer, Tooltip, Legend, Pie } from "recharts";

interface HoldingData {
  ticker: string;
  shares: number;
  currentPrice: number;
  value: number;
  sector: string;
  name: string;
}

interface PortfolioAnalysis {
  holdings: HoldingData[];
  sectorBreakdown: { sector: string; value: number; percentage: number }[];
  totalValue: number;
  sectorConcentration: string;
  thematicAnalysis: string;
  timestamp: string;
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', '#d084d0', '#ffb347', '#87ceeb'];

const PortfolioAnalysisPage = () => {
  const [holdingsInput, setHoldingsInput] = useState("");
  const [analysis, setAnalysis] = useState<PortfolioAnalysis | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAnalyzePortfolio = async () => {
    if (!holdingsInput.trim()) {
      toast.error('Please enter your holdings first');
      return;
    }

    setLoading(true);
    setAnalysis(null);

    try {
      const { data, error } = await supabase.functions.invoke('analyze-portfolio', {
        body: { 
          holdings: holdingsInput.trim()
        }
      });

      if (error) throw error;

      setAnalysis(data);
      toast.success('Portfolio analysis completed!');
    } catch (error) {
      console.error('Error analyzing portfolio:', error);
      toast.error('Failed to analyze portfolio. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Layout>
      <SEO 
        title="Portfolio Analyzer — Personal Investment Analysis | Vin Stock" 
        description="AI-powered portfolio analysis tool providing insights into your investment strategy, sector concentration, and risk assessment." 
        canonical="/portfolio-analysis" 
      />
      

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Input Section */}
          <div className="text-center space-y-4 mb-12">
            <h2 className="text-4xl font-bold text-foreground">
              Portfolio Analyzer
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              AI-powered portfolio analysis. Just describe your holdings in plain English - say "10 Apple shares" instead of "AAPL 10".
            </p>
          </div>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Enter Your Holdings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label htmlFor="holdings" className="block text-sm font-medium text-foreground mb-2">
                  Describe your stock holdings in plain English
                </label>
                <Textarea
                  id="holdings"
                  placeholder="10 shares of Apple, 25 Nvidia, 50 Coca Cola shares"
                  value={holdingsInput}
                  onChange={(e) => setHoldingsInput(e.target.value)}
                  className="min-h-[100px]"
                />
                <p className="text-sm text-muted-foreground mt-2">
                  Examples: "10 Apple, 25 shares of Microsoft" • "5 Tesla and 15 Google" • "AAPL 10, MSFT 25"
                </p>
              </div>
              <Button 
                onClick={handleAnalyzePortfolio}
                disabled={loading || !holdingsInput.trim()}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing Portfolio...
                  </>
                ) : (
                  <>
                    <PieChart className="h-4 w-4 mr-2" />
                    Analyze My Holdings
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Analysis Results */}
          {analysis && (
            <div className="space-y-6">
              {/* Portfolio Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    Portfolio Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Total Value</p>
                      <p className="text-2xl font-bold text-foreground">{formatCurrency(analysis.totalValue)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Holdings</p>
                      <p className="text-2xl font-bold text-foreground">{analysis.holdings.length}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Sectors</p>
                      <p className="text-2xl font-bold text-foreground">{analysis.sectorBreakdown.length}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Largest Position</p>
                      <p className="text-lg font-bold text-foreground">
                        {Math.max(...analysis.holdings.map(h => (h.value / analysis.totalValue) * 100)).toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  {/* Holdings Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2 text-sm font-medium text-muted-foreground">Stock</th>
                          <th className="text-right py-2 text-sm font-medium text-muted-foreground">Shares</th>
                          <th className="text-right py-2 text-sm font-medium text-muted-foreground">Price</th>
                          <th className="text-right py-2 text-sm font-medium text-muted-foreground">Value</th>
                          <th className="text-right py-2 text-sm font-medium text-muted-foreground">Weight</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analysis.holdings.map((holding) => (
                          <tr key={holding.ticker} className="border-b border-border/50">
                            <td className="py-3">
                              <div>
                                <p className="font-medium text-foreground">{holding.ticker}</p>
                                <p className="text-sm text-muted-foreground">{holding.name}</p>
                              </div>
                            </td>
                            <td className="text-right py-3 text-foreground">{holding.shares}</td>
                            <td className="text-right py-3 text-foreground">${holding.currentPrice.toFixed(2)}</td>
                            <td className="text-right py-3 text-foreground">{formatCurrency(holding.value)}</td>
                            <td className="text-right py-3 text-foreground">
                              {((holding.value / analysis.totalValue) * 100).toFixed(1)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Sector Breakdown Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5 text-primary" />
                    Sector Allocation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          dataKey="percentage"
                          data={analysis.sectorBreakdown.map((sector, index) => ({
                            ...sector,
                            fill: COLORS[index % COLORS.length]
                          }))}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={({ sector, percentage }) => `${sector}: ${percentage.toFixed(1)}%`}
                        >
                          {analysis.sectorBreakdown.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                        <Legend />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* AI Analysis */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Sector Concentration Analysis */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-primary" />
                      Concentration Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-foreground leading-relaxed">{analysis.sectorConcentration}</p>
                  </CardContent>
                </Card>

                {/* Thematic Analysis */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-primary" />
                      Strategy Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-foreground leading-relaxed">{analysis.thematicAnalysis}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Timestamp */}
              <div className="text-center text-sm text-muted-foreground">
                Analysis generated at {new Date(analysis.timestamp).toLocaleString()}
              </div>
            </div>
          )}
        </div>
      </main>
    </Layout>
  );
};

export default PortfolioAnalysisPage;