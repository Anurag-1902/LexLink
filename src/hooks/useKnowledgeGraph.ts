import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface GraphNode {
  id: string;
  label: string;
  type: 'case' | 'concept';
  x: number;
  y: number;
  color: string;
  court?: string;
  date?: string;
  jurisdiction?: string;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: 'cites' | 'overrules' | 'similar' | 'contradicts';
  weight?: number;
}

export interface KnowledgeGraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export const useKnowledgeGraph = (limit: number = 50) => {
  return useQuery({
    queryKey: ['knowledge-graph', limit],
    queryFn: async (): Promise<KnowledgeGraphData> => {
      // Fetch cases
      const { data: cases, error: casesError } = await supabase
        .from('legal_cases')
        .select('id, name, name_abbreviation, court, jurisdiction, decision_date')
        .limit(limit);

      if (casesError) throw casesError;

      // Fetch citations
      const { data: citations, error: citationsError } = await supabase
        .from('case_citations')
        .select('id, citing_case_id, cited_case_id, citation_text');

      if (citationsError) throw citationsError;

      // Fetch similarities
      const { data: similarities, error: similaritiesError } = await supabase
        .from('case_similarities')
        .select('id, case_a_id, case_b_id, similarity_score');

      if (similaritiesError) throw similaritiesError;

      // Fetch contradictions
      const { data: contradictions, error: contradictionsError } = await supabase
        .from('case_contradictions')
        .select('id, case_a_id, case_b_id, conflict_type, confidence_score');

      if (contradictionsError) throw contradictionsError;

      // Create nodes with force-directed-like positioning
      const caseIds = new Set((cases || []).map(c => c.id));
      const nodeCount = cases?.length || 0;
      const centerX = 400;
      const centerY = 250;
      const radius = Math.min(180, nodeCount * 6);

      const nodes: GraphNode[] = (cases || []).map((caseItem, index) => {
        const angle = (2 * Math.PI * index) / nodeCount;
        const jitter = Math.random() * 20 - 10;
        
        return {
          id: caseItem.id,
          label: caseItem.name_abbreviation || caseItem.name.substring(0, 25) + '...',
          type: 'case' as const,
          x: centerX + (radius + jitter) * Math.cos(angle),
          y: centerY + (radius + jitter) * Math.sin(angle),
          color: getCaseColor(caseItem.court),
          court: caseItem.court,
          date: caseItem.decision_date,
          jurisdiction: caseItem.jurisdiction,
        };
      });

      // Extract unique jurisdictions and add as concept nodes
      const jurisdictionSet = new Set<string>();
      (cases || []).forEach(c => {
        if (c.jurisdiction) jurisdictionSet.add(c.jurisdiction);
      });

      const conceptNodes: GraphNode[] = Array.from(jurisdictionSet).slice(0, 5).map((concept, index) => ({
        id: `concept-${concept}`,
        label: concept,
        type: 'concept' as const,
        x: centerX + Math.cos((index * Math.PI * 2) / 5 + Math.PI / 4) * 100,
        y: centerY + Math.sin((index * Math.PI * 2) / 5 + Math.PI / 4) * 100,
        color: 'hsl(35, 90%, 50%)',
      }));

      // Create edges from citations (only for cases in our set)
      const edges: GraphEdge[] = [];

      (citations || []).forEach(citation => {
        if (citation.citing_case_id && citation.cited_case_id &&
            caseIds.has(citation.citing_case_id) && caseIds.has(citation.cited_case_id)) {
          edges.push({
            id: `cite-${citation.id}`,
            source: citation.citing_case_id,
            target: citation.cited_case_id,
            type: 'cites',
          });
        }
      });

      // Add similarity edges (high similarity only)
      (similarities || []).forEach(sim => {
        if (sim.case_a_id && sim.case_b_id && sim.similarity_score >= 0.7 &&
            caseIds.has(sim.case_a_id) && caseIds.has(sim.case_b_id)) {
          edges.push({
            id: `sim-${sim.id}`,
            source: sim.case_a_id,
            target: sim.case_b_id,
            type: 'similar',
            weight: sim.similarity_score,
          });
        }
      });

      // Add contradiction edges
      (contradictions || []).forEach(contra => {
        if (contra.case_a_id && contra.case_b_id &&
            caseIds.has(contra.case_a_id) && caseIds.has(contra.case_b_id)) {
          const isOverrule = contra.conflict_type?.toLowerCase().includes('overrule');
          edges.push({
            id: `contra-${contra.id}`,
            source: contra.case_a_id,
            target: contra.case_b_id,
            type: isOverrule ? 'overrules' : 'contradicts',
            weight: contra.confidence_score || undefined,
          });
        }
      });

      return {
        nodes: [...nodes, ...conceptNodes],
        edges,
      };
    },
  });
};

function getCaseColor(court: string): string {
  if (court?.toLowerCase().includes('supreme')) {
    return 'hsl(220, 70%, 50%)';
  } else if (court?.toLowerCase().includes('circuit') || court?.toLowerCase().includes('appeals')) {
    return 'hsl(200, 60%, 50%)';
  } else if (court?.toLowerCase().includes('district')) {
    return 'hsl(180, 50%, 45%)';
  } else {
    return 'hsl(160, 45%, 45%)';
  }
}
