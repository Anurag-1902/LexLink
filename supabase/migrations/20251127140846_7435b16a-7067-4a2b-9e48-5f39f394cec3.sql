-- Enable pgvector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Create legal cases table
CREATE TABLE public.legal_cases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  name_abbreviation TEXT,
  court TEXT NOT NULL,
  decision_date DATE,
  jurisdiction TEXT,
  docket_number TEXT,
  citations JSONB DEFAULT '[]'::jsonb,
  url TEXT,
  frontend_url TEXT,
  preview TEXT[],
  summary TEXT,
  headnotes TEXT,
  full_text TEXT,
  case_opinions JSONB DEFAULT '[]'::jsonb,
  embeddings vector(768),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX idx_legal_cases_case_id ON public.legal_cases(case_id);
CREATE INDEX idx_legal_cases_court ON public.legal_cases(court);
CREATE INDEX idx_legal_cases_jurisdiction ON public.legal_cases(jurisdiction);
CREATE INDEX idx_legal_cases_decision_date ON public.legal_cases(decision_date);
CREATE INDEX idx_legal_cases_name ON public.legal_cases USING gin(to_tsvector('english', name));

-- Create citations table for graph relationships
CREATE TABLE public.case_citations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  citing_case_id UUID REFERENCES public.legal_cases(id) ON DELETE CASCADE,
  cited_case_id UUID REFERENCES public.legal_cases(id) ON DELETE CASCADE,
  citation_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(citing_case_id, cited_case_id)
);

-- Create similarity relationships table
CREATE TABLE public.case_similarities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_a_id UUID REFERENCES public.legal_cases(id) ON DELETE CASCADE,
  case_b_id UUID REFERENCES public.legal_cases(id) ON DELETE CASCADE,
  similarity_score FLOAT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(case_a_id, case_b_id)
);

-- Create contradictions table
CREATE TABLE public.case_contradictions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_a_id UUID REFERENCES public.legal_cases(id) ON DELETE CASCADE,
  case_b_id UUID REFERENCES public.legal_cases(id) ON DELETE CASCADE,
  conflict_type TEXT NOT NULL,
  description TEXT,
  confidence_score FLOAT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(case_a_id, case_b_id)
);

-- Enable RLS (cases are public data)
ALTER TABLE public.legal_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_citations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_similarities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_contradictions ENABLE ROW LEVEL SECURITY;

-- Public read access policies
CREATE POLICY "Anyone can view legal cases" ON public.legal_cases FOR SELECT USING (true);
CREATE POLICY "Anyone can view citations" ON public.case_citations FOR SELECT USING (true);
CREATE POLICY "Anyone can view similarities" ON public.case_similarities FOR SELECT USING (true);
CREATE POLICY "Anyone can view contradictions" ON public.case_contradictions FOR SELECT USING (true);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_legal_cases_updated_at
  BEFORE UPDATE ON public.legal_cases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();