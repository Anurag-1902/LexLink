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
      /** When true, disables user-facing toasts (useful for bulk runs). */
      silent?: boolean;
    }): Promise<{ relationships: DetectedRelationships; analyzedCasesCount: number }> => {
      const { silent, ...payload } = caseData;

      const { data, error } = await supabase.functions.invoke("detect-relationships", {
        body: payload,
      });

      if (error) {
        const err: any = error;
        const status = err?.status ?? err?.context?.status ?? err?.context?.response?.status;

        let message: string = err?.message || "Relationship detection failed";
        try {
          const body = err?.context?.body;
          if (typeof body === "string") {
            const parsed = JSON.parse(body);
            if (parsed?.error) message = parsed.error;
          } else if (body?.error) {
            message = body.error;
          }
        } catch {
          // ignore
        }

        throw Object.assign(new Error(message), { status });
      }

      if ((data as any)?.error) {
        throw Object.assign(new Error((data as any).error), { status: 500 });
      }

      return data;
    },
    onError: (error: any, variables?: any) => {
      console.error("Relationship detection error:", error);
      if (variables?.silent) return;

      const status = error?.status;
      const msg = error?.message || "Detection failed";

      if (status === 429 || String(msg).includes("429")) {
        toast({
          title: "Rate limit exceeded",
          description: "Too many AI requests. Please try again in a moment.",
          variant: "destructive",
        });
      } else if (status === 402 || String(msg).includes("402")) {
        toast({
          title: "AI usage limit reached",
          description: "Please add credits to continue.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Detection failed",
          description: msg,
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
      /** When true, disables user-facing toasts (useful for bulk runs). */
      silent?: boolean;
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
    onSuccess: (results, variables) => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-graph"] });
      queryClient.invalidateQueries({ queryKey: ["case-stats"] });

      if ((variables as any)?.silent) return;

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
