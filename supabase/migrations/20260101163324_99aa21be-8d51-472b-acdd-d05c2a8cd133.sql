-- Enable INSERT, UPDATE, DELETE for legal_cases (public access for demo purposes)
CREATE POLICY "Anyone can insert legal cases"
ON public.legal_cases
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can delete legal cases"
ON public.legal_cases
FOR DELETE
USING (true);

CREATE POLICY "Anyone can update legal cases"
ON public.legal_cases
FOR UPDATE
USING (true);

-- Enable INSERT and DELETE for case_citations
CREATE POLICY "Anyone can insert citations"
ON public.case_citations
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can delete citations"
ON public.case_citations
FOR DELETE
USING (true);

-- Enable INSERT and DELETE for case_similarities
CREATE POLICY "Anyone can insert similarities"
ON public.case_similarities
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can delete similarities"
ON public.case_similarities
FOR DELETE
USING (true);

-- Enable INSERT and DELETE for case_contradictions
CREATE POLICY "Anyone can insert contradictions"
ON public.case_contradictions
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can delete contradictions"
ON public.case_contradictions
FOR DELETE
USING (true);