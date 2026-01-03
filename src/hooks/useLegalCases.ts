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

// Hook to summarize a case using AI
export const useSummarizeCase = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (caseData: {
      caseId: string;
      caseName: string;
      court: string;
      jurisdiction?: string;
      fullText?: string;
      headnotes?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('summarize-case', {
        body: {
          caseId: caseData.caseId,
          caseName: caseData.caseName,
          court: caseData.court,
          jurisdiction: caseData.jurisdiction,
          fullText: caseData.fullText,
          headnotes: caseData.headnotes,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["legal-cases"] });
      queryClient.invalidateQueries({ queryKey: ["knowledge-graph"] });
    },
    onError: (error: Error) => {
      console.error("Summarization error:", error);
      toast({
        title: "Summarization failed",
        description: error.message,
        variant: "destructive",
      });
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
      full_text?: string;
      headnotes?: string;
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
          full_text: caseData.full_text,
          headnotes: caseData.headnotes,
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

export const useAddCitation = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { citing_case_id: string; cited_case_id: string; citation_text?: string }) => {
      const { data: result, error } = await supabase
        .from("case_citations")
        .insert({
          citing_case_id: data.citing_case_id,
          cited_case_id: data.cited_case_id,
          citation_text: data.citation_text,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["case-stats"] });
      queryClient.invalidateQueries({ queryKey: ["knowledge-graph"] });
      toast({
        title: "Citation added",
        description: "The citation relationship has been created.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add citation",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useAddContradiction = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { 
      case_a_id: string; 
      case_b_id: string; 
      conflict_type: string;
      confidence_score?: number;
      description?: string;
    }) => {
      const { data: result, error } = await supabase
        .from("case_contradictions")
        .insert({
          case_a_id: data.case_a_id,
          case_b_id: data.case_b_id,
          conflict_type: data.conflict_type,
          confidence_score: data.confidence_score || 0.8,
          description: data.description,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["case-stats"] });
      queryClient.invalidateQueries({ queryKey: ["knowledge-graph"] });
      toast({
        title: "Contradiction added",
        description: "The contradiction relationship has been created.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add contradiction",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useAddSimilarity = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { case_a_id: string; case_b_id: string; similarity_score: number }) => {
      const { data: result, error } = await supabase
        .from("case_similarities")
        .insert({
          case_a_id: data.case_a_id,
          case_b_id: data.case_b_id,
          similarity_score: data.similarity_score,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["case-stats"] });
      queryClient.invalidateQueries({ queryKey: ["knowledge-graph"] });
      toast({
        title: "Similarity added",
        description: "The similarity relationship has been created.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add similarity",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};