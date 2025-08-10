-- Create news table for storing stock news
CREATE TABLE public.news (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticker TEXT NOT NULL,
  headline TEXT NOT NULL,
  summary TEXT,
  url TEXT,
  source TEXT,
  published_at TIMESTAMP WITH TIME ZONE NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access
CREATE POLICY "Anyone can view news" 
ON public.news 
FOR SELECT 
USING (true);

-- Create index for efficient ticker lookups
CREATE INDEX idx_news_ticker_published ON public.news (ticker, published_at DESC);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_news_updated_at
BEFORE UPDATE ON public.news
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();