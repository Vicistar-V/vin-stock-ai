-- Drop SEC-related function
DROP FUNCTION IF EXISTS public.match_sec_filing_chunks(vector, uuid, double precision, integer);

-- Drop SEC filing embeddings table
DROP TABLE IF EXISTS public.sec_filing_embeddings;

-- Drop SEC filings table
DROP TABLE IF EXISTS public.sec_filings;