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

export const useAddCase = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (caseData: {
      name: string;
      court: string;
      case_id: string;
      jurisdiction?: string;
      decision_date?: string;
      summary?: string;
      docket_number?: string;
    }) => {
      const { data, error } = await supabase
        .from("legal_cases")
        .insert({
          name: caseData.name,
          court: caseData.court,
          case_id: caseData.case_id,
          jurisdiction: caseData.jurisdiction,
          decision_date: caseData.decision_date,
          summary: caseData.summary,
          docket_number: caseData.docket_number,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["legal-cases"] });
      queryClient.invalidateQueries({ queryKey: ["case-stats"] });
      queryClient.invalidateQueries({ queryKey: ["knowledge-graph"] });
      toast({
        title: "Case added",
        description: "The case has been added to the dataset.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add case",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useDeleteCase = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (caseId: string) => {
      // Delete related citations, similarities, and contradictions first
      await supabase.from("case_citations").delete().or(`citing_case_id.eq.${caseId},cited_case_id.eq.${caseId}`);
      await supabase.from("case_similarities").delete().or(`case_a_id.eq.${caseId},case_b_id.eq.${caseId}`);
      await supabase.from("case_contradictions").delete().or(`case_a_id.eq.${caseId},case_b_id.eq.${caseId}`);

      const { error } = await supabase
        .from("legal_cases")
        .delete()
        .eq("id", caseId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["legal-cases"] });
      queryClient.invalidateQueries({ queryKey: ["case-stats"] });
      queryClient.invalidateQueries({ queryKey: ["knowledge-graph"] });
      toast({
        title: "Case deleted",
        description: "The case has been removed from the dataset.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete case",
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