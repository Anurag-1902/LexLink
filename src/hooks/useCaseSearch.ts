import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type CaseSearchRow = {
  id: string;
  name: string;
  court: string;
  decision_date: string | null;
  summary: string | null;
  jurisdiction: string | null;
};

const toSafeTerm = (term: string) => term.replace(/[%_]/g, "");

const tokenize = (query: string) =>
  query
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 1)
    .map(toSafeTerm)
    .filter(Boolean);

/**
 * Database-backed case search.
 * - AND logic across terms
 * - Matches against AI summary for precision
 */
export const useCaseSearch = () => {
  return useMutation({
    mutationFn: async (query: string) => {
      const terms = tokenize(query);

      let q = supabase
        .from("legal_cases")
        .select("id,name,court,decision_date,summary,jurisdiction")
        .not("summary", "is", null);

      // AND across terms
      for (const term of terms) {
        q = q.ilike("summary", `%${term}%`);
      }

      const { data, error } = await q.order("decision_date", { ascending: false }).limit(75);
      if (error) throw error;

      return (data ?? []) as CaseSearchRow[];
    },
  });
};
