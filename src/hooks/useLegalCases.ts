import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface LegalCase {
  id: string;
  case_id: string;
  name: string;
  name_abbreviation?: string;
  court: string;
  decision_date?: string;
  jurisdiction?: string;
  docket_number?: string;
  citations?: any[];
  url?: string;
  frontend_url?: string;
  preview?: string[];
  summary?: string;
  headnotes?: string;
  full_text?: string;
  case_opinions?: any[];
  metadata?: any;
  created_at: string;
  updated_at: string;
}

export const useLegalCases = (limit = 10) => {
  return useQuery({
    queryKey: ["legal-cases", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("legal_cases")
        .select("*")
        .order("decision_date", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as LegalCase[];
    },
  });
};

export const useImportCases = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ court = "", limit = 20, page = 1 }: { 
      court?: string; 
      limit?: number;
      page?: number;
    }) => {
      const { data, error } = await supabase.functions.invoke("import-cases", {
        body: { court, limit, page },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["legal-cases"] });
      toast({
        title: "Cases imported successfully",
        description: `Processed ${data.processed} cases. ${data.errors > 0 ? `${data.errors} errors occurred.` : ''}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Import failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useCaseStats = () => {
  return useQuery({
    queryKey: ["case-stats"],
    queryFn: async () => {
      const [casesCount, citationsCount, contradictionsCount, similaritiesCount] = await Promise.all([
        supabase.from("legal_cases").select("*", { count: "exact", head: true }),
        supabase.from("case_citations").select("*", { count: "exact", head: true }),
        supabase.from("case_contradictions").select("*", { count: "exact", head: true }),
        supabase.from("case_similarities").select("*", { count: "exact", head: true }),
      ]);

      return {
        totalCases: casesCount.count || 0,
        citations: citationsCount.count || 0,
        contradictions: contradictionsCount.count || 0,
        graphNodes: (casesCount.count || 0) + (citationsCount.count || 0),
        similarityScore: similaritiesCount.count || 0,
      };
    },
  });
};