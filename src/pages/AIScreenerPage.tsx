import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, Search, Loader2, TrendingUp, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import LoadingOverlay from "@/components/LoadingOverlay";
import SEO from "@/components/SEO";
import Layout from "@/components/Layout";

interface StockSuggestion {
  ticker: string;
  name: string;
  justification: string;
}

interface ScreenerResult {
  suggestions: StockSuggestion[];
  query_interpretation: string;
}

const AIScreenerPage = () => {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<ScreenerResult | null>(null);

  const exampleQueries = [
    "Find me fast-growing tech companies under $50",
    "Show me stable dividend stocks for retirement",
    "I want undervalued energy stocks with good fundamentals",
    "Find emerging market stocks with strong momentum"
  ];

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!query.trim()) {
      toast.error("Please enter your investment idea");
      return;
    }

    setIsLoading(true);
    setResults(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('ai-screener', {
        body: { query: query.trim() }
      });

      if (error) throw error;

      if (data.success) {
        setResults(data);
        toast.success("Found some great investment ideas for you!");
      } else {
        throw new Error(data.error || 'Failed to generate investment ideas');
      }
    } catch (error: any) {
      console.error('Screener error:', error);
      toast.error(error.message || 'Failed to generate investment ideas. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExampleClick = (example: string) => {
    setQuery(example);
  };

  return (
    <Layout>
      <SEO 
        title="AI Stock Screener — Smart Investment Ideas | Vin Stock" 
        description="Tell our AI what you're looking for and get personalized stock recommendations with explanations." 
        canonical="/ai-screener" 
      />
      

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Hero Section */}
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Lightbulb className="h-12 w-12 text-primary" />
            </div>
            <h2 className="text-4xl font-bold text-foreground">
              AI Investment Idea Generator
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              AI-driven stock discovery. Describe what you're looking for in plain English, and get intelligent investment recommendations.
            </p>
          </div>

          {/* Search Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                What kind of stocks are you looking for?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleSearch} className="space-y-4">
                <div className="space-y-2">
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="e.g., 'Find me cheap tech stocks with strong growth potential'"
                    className="h-12 text-lg"
                    disabled={isLoading}
                  />
                  <div className="text-xs text-muted-foreground">
                    Be as specific as you want - mention industries, price ranges, financial metrics, or investment goals
                  </div>
                </div>
                
                <Button 
                  type="submit" 
                  disabled={isLoading || !query.trim()}
                  className="w-full h-12"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Generating Ideas...
                    </>
                  ) : (
                    <>
                      <Lightbulb className="h-4 w-4 mr-2" />
                      Generate Investment Ideas
                    </>
                  )}
                </Button>
              </form>

              {/* Example Queries */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Try these examples:</p>
                <div className="flex flex-wrap gap-2">
                  {exampleQueries.map((example, index) => (
                    <Badge
                      key={index}
                      variant="outline"
                      className="cursor-pointer hover:bg-primary/10 transition-colors"
                      onClick={() => handleExampleClick(example)}
                    >
                      {example}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Loading State */}
          {isLoading && (
            <div className="relative py-12">
              <LoadingOverlay 
                show={true} 
                message="Our AI is analyzing thousands of stocks to find the best matches..." 
              />
            </div>
          )}

          {/* Results */}
          {results && !isLoading && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Investment Ideas for You
                </CardTitle>
                <p className="text-muted-foreground">
                  Based on your query: "{results.query_interpretation}"
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                {results.suggestions.map((suggestion, index) => (
                  <div key={index} className="border border-border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="font-mono">
                          {suggestion.ticker}
                        </Badge>
                        <span className="font-semibold text-foreground">
                          {suggestion.name}
                        </span>
                      </div>
                      <Link to={`/stock/${suggestion.ticker}`}>
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                      </Link>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {suggestion.justification}
                    </p>
                  </div>
                ))}
                
                <div className="text-xs text-muted-foreground text-center pt-4 border-t">
                  AI-generated suggestions based on current market data. 
                  Always do your own research before making investment decisions.
                </div>
              </CardContent>
            </Card>
          )}

          {/* Empty State */}
          {!results && !isLoading && (
            <div className="text-center py-12 text-muted-foreground">
              <Lightbulb className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">Ready to find your next investment opportunity?</p>
              <p className="text-sm mt-2">
                Describe what you're looking for and let our AI do the heavy lifting
              </p>
            </div>
          )}
        </div>
      </main>
    </Layout>
  );
};

export default AIScreenerPage;