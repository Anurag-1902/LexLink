import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface DetectedRelationships {
  citations: Array<{
    targetCaseId: string;
    targetCaseName: string;
    reason: string;
  }>;
  similarities: Array<{
    targetCaseId: string;
    targetCaseName: string;
    score: number;
    reason: string;
  }>;
  contradictions: Array<{
    targetCaseId: string;
    targetCaseName: string;
    conflictType: string;
    confidence: number;
    description: string;
  }>;
}

export const useDetectRelationships = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (caseData: {
      newCaseId: string;
      newCaseName: string;
      newCaseSummary?: string;
      newCaseCourt: string;
      newCaseJurisdiction?: string;
    }): Promise<{ relationships: DetectedRelationships; analyzedCasesCount: number }> => {
      const { data, error } = await supabase.functions.invoke('detect-relationships', {
        body: caseData
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data;
    },
    onError: (error: Error) => {
      console.error("Relationship detection error:", error);
      if (error.message?.includes("429")) {
        toast({
          title: "Rate limit exceeded",
          description: "Please try again later.",
          variant: "destructive",
        });
      } else if (error.message?.includes("402")) {
        toast({
          title: "AI usage limit reached",
          description: "Please add credits to continue.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Detection failed",
          description: error.message,
          variant: "destructive",
        });
      }
    },
  });
};

export const useAutoCreateRelationships = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      newCaseId: string;
      relationships: DetectedRelationships;
    }) => {
      const { newCaseId, relationships } = params;
      const results = { citations: 0, similarities: 0, contradictions: 0 };

      // Create citations
      for (const citation of relationships.citations) {
        try {
          await supabase.from("case_citations").insert({
            citing_case_id: newCaseId,
            cited_case_id: citation.targetCaseId,
            citation_text: citation.reason,
          });
          results.citations++;
        } catch (err) {
          console.error("Failed to create citation:", err);
        }
      }

      // Create similarities
      for (const similarity of relationships.similarities) {
        try {
          await supabase.from("case_similarities").insert({
            case_a_id: newCaseId,
            case_b_id: similarity.targetCaseId,
            similarity_score: similarity.score,
          });
          results.similarities++;
        } catch (err) {
          console.error("Failed to create similarity:", err);
        }
      }

      // Create contradictions
      for (const contradiction of relationships.contradictions) {
        try {
          await supabase.from("case_contradictions").insert({
            case_a_id: newCaseId,
            case_b_id: contradiction.targetCaseId,
            conflict_type: contradiction.conflictType,
            confidence_score: contradiction.confidence,
            description: contradiction.description,
          });
          results.contradictions++;
        } catch (err) {
          console.error("Failed to create contradiction:", err);
        }
      }

      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-graph"] });
      queryClient.invalidateQueries({ queryKey: ["case-stats"] });
      
      const total = results.citations + results.similarities + results.contradictions;
      if (total > 0) {
        toast({
          title: "AI Relationships Created",
          description: `Added ${results.citations} citations, ${results.similarities} similarities, ${results.contradictions} contradictions`,
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create relationships",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};
