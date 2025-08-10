-- Create stocks table for basic stock information
CREATE TABLE public.stocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticker TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  logo TEXT,
  market_cap BIGINT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create stock_quotes table for real-time price data
CREATE TABLE public.stock_quotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticker TEXT NOT NULL,
  current_price DECIMAL(12,4) NOT NULL,
  price_change DECIMAL(12,4) NOT NULL,
  change_percent DECIMAL(8,4) NOT NULL,
  high DECIMAL(12,4) NOT NULL,
  low DECIMAL(12,4) NOT NULL,
  open DECIMAL(12,4) NOT NULL,
  previous_close DECIMAL(12,4) NOT NULL,
  volume BIGINT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create stock_history table for chart data
CREATE TABLE public.stock_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticker TEXT NOT NULL,
  price DECIMAL(12,4) NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  timeframe TEXT NOT NULL, -- '1D', '5D', '1M', '6M', '1Y', 'MAX'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS (but make tables publicly readable for this use case)
ALTER TABLE public.stocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_history ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Anyone can view stocks" ON public.stocks FOR SELECT USING (true);
CREATE POLICY "Anyone can view stock quotes" ON public.stock_quotes FOR SELECT USING (true);
CREATE POLICY "Anyone can view stock history" ON public.stock_history FOR SELECT USING (true);

-- Create indexes for performance
CREATE INDEX idx_stocks_ticker ON public.stocks(ticker);
CREATE INDEX idx_stock_quotes_ticker ON public.stock_quotes(ticker);
CREATE INDEX idx_stock_quotes_timestamp ON public.stock_quotes(timestamp DESC);
CREATE INDEX idx_stock_history_ticker_timeframe ON public.stock_history(ticker, timeframe);
CREATE INDEX idx_stock_history_timestamp ON public.stock_history(timestamp DESC);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_stocks_updated_at
  BEFORE UPDATE ON public.stocks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert popular stocks
INSERT INTO public.stocks (ticker, name, logo) VALUES
  ('AAPL', 'Apple Inc.', 'https://logo.clearbit.com/apple.com'),
  ('MSFT', 'Microsoft Corporation', 'https://logo.clearbit.com/microsoft.com'),
  ('GOOGL', 'Alphabet Inc.', 'https://logo.clearbit.com/google.com'),
  ('AMZN', 'Amazon.com Inc.', 'https://logo.clearbit.com/amazon.com'),
  ('TSLA', 'Tesla Inc.', 'https://logo.clearbit.com/tesla.com'),
  ('META', 'Meta Platforms Inc.', 'https://logo.clearbit.com/meta.com'),
  ('NVDA', 'NVIDIA Corporation', 'https://logo.clearbit.com/nvidia.com'),
  ('JPM', 'JPMorgan Chase & Co.', 'https://logo.clearbit.com/jpmorganchase.com'),
  ('NFLX', 'Netflix Inc.', 'https://logo.clearbit.com/netflix.com'),
  ('V', 'Visa Inc.', 'https://logo.clearbit.com/visa.com')
ON CONFLICT (ticker) DO NOTHING;