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

      const isDuplicate = (e: any) =>
        e?.code === "23505" ||
        String(e?.message || "").toLowerCase().includes("duplicate key") ||
        String(e?.details || "").toLowerCase().includes("already exists");

      const isPermission = (e: any) => {
        const msg = String(e?.message || "").toLowerCase();
        const details = String(e?.details || "").toLowerCase();
        return (
          e?.code === "42501" ||
          msg.includes("row-level security") ||
          msg.includes("permission denied") ||
          details.includes("row-level security")
        );
      };

      // Create citations
      for (const citation of relationships.citations || []) {
        const { error } = await supabase.from("case_citations").insert({
          citing_case_id: newCaseId,
          cited_case_id: citation.targetCaseId,
          citation_text: citation.reason,
        });

        if (error) {
          if (isDuplicate(error)) continue;
          if (isPermission(error)) {
            throw Object.assign(new Error("You must be signed in to save detected relationships."), {
              status: 403,
              code: error.code,
            });
          }
          console.error("Failed to create citation:", error);
          continue;
        }

        results.citations++;
      }

      // Create similarities
      for (const similarity of relationships.similarities || []) {
        const { error } = await supabase.from("case_similarities").insert({
          case_a_id: newCaseId,
          case_b_id: similarity.targetCaseId,
          similarity_score: similarity.score,
        });

        if (error) {
          if (isDuplicate(error)) continue;
          if (isPermission(error)) {
            throw Object.assign(new Error("You must be signed in to save detected relationships."), {
              status: 403,
              code: error.code,
            });
          }
          console.error("Failed to create similarity:", error);
          continue;
        }

        results.similarities++;
      }

      // Create contradictions
      for (const contradiction of relationships.contradictions || []) {
        const { error } = await supabase.from("case_contradictions").insert({
          case_a_id: newCaseId,
          case_b_id: contradiction.targetCaseId,
          conflict_type: contradiction.conflictType,
          confidence_score: contradiction.confidence,
          description: contradiction.description,
        });

        if (error) {
          if (isDuplicate(error)) continue;
          if (isPermission(error)) {
            throw Object.assign(new Error("You must be signed in to save detected relationships."), {
              status: 403,
              code: error.code,
            });
          }
          console.error("Failed to create contradiction:", error);
          continue;
        }

        results.contradictions++;
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
      } else {
        toast({
          title: "No new relationships",
          description: "No new relationships were added (they may already exist).",
        });
      }
    },
    onError: (error: any, variables?: any) => {
      if ((variables as any)?.silent) return;

      toast({
        title: "Failed to create relationships",
        description: error?.message || "Unknown error",
        variant: "destructive",
      });
    },
  });
};

