import { useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface StockSearchProps {
  onResult: (data: any) => void;
  onError: (error: string) => void;
}

export function StockSearch({ onResult, onError }: StockSearchProps) {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!query.trim()) {
      toast.error("Please enter a search query");
      return;
    }

    setIsLoading(true);
    
    try {
      // Make a direct fetch call since Supabase client doesn't handle 400 responses well
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stock-search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ query: query.trim() })
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle error responses (like 400 status)
        const errorMessage = data.error || 'Failed to search for stock. Please try again.';
        onError(errorMessage);
        toast.error(errorMessage);
        
        if (data.suggestions) {
          console.log('Search suggestions:', data.suggestions);
          // Optionally show suggestions to user
          data.suggestions.forEach((suggestion: string, index: number) => {
            setTimeout(() => {
              toast.info(suggestion);
            }, (index + 1) * 1000);
          });
        }
        return;
      }

      // Success case
      onResult(data);
      toast.success(`Found data for ${data.ticker}`);
    } catch (error: any) {
      console.error('Search error:', error);
      const errorMessage = error.message || 'Failed to search for stock. Please try again.';
      onError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            id="global-stock-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for a company or ticker (e.g., 'Apple stock', 'MSFT', 'the company that makes electric cars')"
            className="pl-10 h-12 text-lg bg-input border-border focus:border-primary"
            disabled={isLoading}
          />
        </div>
        <Button 
          type="submit" 
          disabled={isLoading || !query.trim()}
          className="h-12 px-6 bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Search"
          )}
        </Button>
      </form>
      
      <div className="mt-3 text-sm text-muted-foreground text-center">
        Press "/" to focus the search • Try: "Apple stock", "Microsoft", "TSLA"
      </div>
    </div>
  );
}