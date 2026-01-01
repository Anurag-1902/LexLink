import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface GraphNode {
  id: string;
  label: string;
  type: 'case' | 'domain' | 'court';
  x: number;
  y: number;
  color: string;
  court?: string;
  date?: string;
  jurisdiction?: string;
  size?: number;
  description?: string;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: 'cites' | 'overrules' | 'similar' | 'contradicts' | 'belongs_to';
  weight?: number;
  label?: string;
}

export interface KnowledgeGraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// Legal domain categories for clustering
const LEGAL_DOMAINS: Record<string, { color: string; keywords: string[] }> = {
  'Constitutional Law': {
    color: 'hsl(220, 75%, 55%)',
    keywords: ['constitution', 'amendment', 'rights', 'due process', 'equal protection', 'first amendment', 'fourth amendment', 'fifth amendment'],
  },
  'Criminal Law': {
    color: 'hsl(0, 70%, 55%)',
    keywords: ['criminal', 'murder', 'theft', 'felony', 'misdemeanor', 'sentence', 'prosecution', 'defendant'],
  },
  'Civil Rights': {
    color: 'hsl(280, 65%, 55%)',
    keywords: ['civil rights', 'discrimination', 'segregation', 'voting', 'equality', 'race', 'gender'],
  },
  'Contract Law': {
    color: 'hsl(140, 60%, 45%)',
    keywords: ['contract', 'breach', 'agreement', 'damages', 'consideration', 'performance'],
  },
  'Tort Law': {
    color: 'hsl(35, 85%, 50%)',
    keywords: ['negligence', 'liability', 'injury', 'damages', 'duty of care', 'malpractice'],
  },
  'Property Law': {
    color: 'hsl(180, 55%, 45%)',
    keywords: ['property', 'ownership', 'lease', 'real estate', 'easement', 'title'],
  },
};

// Court hierarchy for layout
const COURT_HIERARCHY: Record<string, number> = {
  'Supreme Court': 0,
  'Appeals': 1,
  'Circuit': 1,
  'District': 2,
  'State Supreme': 1,
  'State Appeals': 2,
  'Trial': 3,
};

function detectDomain(caseItem: { name: string; summary?: string | null }): string {
  const text = `${caseItem.name} ${caseItem.summary || ''}`.toLowerCase();
  
  for (const [domain, config] of Object.entries(LEGAL_DOMAINS)) {
    if (config.keywords.some(keyword => text.includes(keyword))) {
      return domain;
    }
  }
  return 'General';
}

function getCourtLevel(court: string): number {
  const courtLower = court.toLowerCase();
  for (const [key, level] of Object.entries(COURT_HIERARCHY)) {
    if (courtLower.includes(key.toLowerCase())) {
      return level;
    }
  }
  return 2;
}

function getCourtColor(court: string): string {
  const level = getCourtLevel(court);
  switch (level) {
    case 0: return 'hsl(45, 100%, 50%)'; // Gold for Supreme Court
    case 1: return 'hsl(200, 70%, 55%)'; // Blue for Appeals
    case 2: return 'hsl(160, 55%, 50%)'; // Teal for District
    default: return 'hsl(210, 40%, 55%)';
  }
}

export const useKnowledgeGraph = (limit: number = 50) => {
  return useQuery({
    queryKey: ['knowledge-graph', limit],
    queryFn: async (): Promise<KnowledgeGraphData> => {
      // Fetch cases with summary for domain detection
      const { data: cases, error: casesError } = await supabase
        .from('legal_cases')
        .select('id, name, name_abbreviation, court, jurisdiction, decision_date, summary')
        .order('decision_date', { ascending: false })
        .limit(limit);

      if (casesError) throw casesError;
      if (!cases || cases.length === 0) {
        return { nodes: [], edges: [] };
      }

      // Fetch relationships
      const [citationsRes, similaritiesRes, contradictionsRes] = await Promise.all([
        supabase.from('case_citations').select('id, citing_case_id, cited_case_id, citation_text'),
        supabase.from('case_similarities').select('id, case_a_id, case_b_id, similarity_score'),
        supabase.from('case_contradictions').select('id, case_a_id, case_b_id, conflict_type, confidence_score'),
      ]);

      const citations = citationsRes.data || [];
      const similarities = similaritiesRes.data || [];
      const contradictions = contradictionsRes.data || [];

      // Group cases by domain for clustered layout
      const casesByDomain: Record<string, typeof cases> = {};
      cases.forEach(c => {
        const domain = detectDomain(c);
        if (!casesByDomain[domain]) casesByDomain[domain] = [];
        casesByDomain[domain].push(c);
      });

      const domains = Object.keys(casesByDomain);
      const caseIds = new Set(cases.map(c => c.id));
      
      // Canvas dimensions
      const width = 800;
      const height = 450;
      const centerX = width / 2;
      const centerY = height / 2;

      const nodes: GraphNode[] = [];
      const edges: GraphEdge[] = [];

      // Create domain nodes (central hubs)
      const domainRadius = 120;
      domains.forEach((domain, i) => {
        const angle = (2 * Math.PI * i) / domains.length - Math.PI / 2;
        const domainConfig = LEGAL_DOMAINS[domain];
        
        nodes.push({
          id: `domain-${domain}`,
          label: domain,
          type: 'domain',
          x: centerX + domainRadius * Math.cos(angle),
          y: centerY + domainRadius * Math.sin(angle),
          color: domainConfig?.color || 'hsl(210, 40%, 55%)',
          size: 20,
          description: `${casesByDomain[domain].length} cases`,
        });
      });

      // Position case nodes in clusters around their domain
      domains.forEach((domain, domainIndex) => {
        const domainAngle = (2 * Math.PI * domainIndex) / domains.length - Math.PI / 2;
        const domainX = centerX + domainRadius * Math.cos(domainAngle);
        const domainY = centerY + domainRadius * Math.sin(domainAngle);
        
        const domainCases = casesByDomain[domain];
        const clusterRadius = Math.min(80, 30 + domainCases.length * 8);
        
        domainCases.forEach((caseItem, caseIndex) => {
          // Arrange cases in a circle around their domain
          const caseAngle = (2 * Math.PI * caseIndex) / domainCases.length;
          const jitter = (Math.random() - 0.5) * 15;
          
          // Position by court hierarchy (higher courts closer to center)
          const courtLevel = getCourtLevel(caseItem.court);
          const levelOffset = courtLevel * 15;
          
          const x = domainX + (clusterRadius + levelOffset + jitter) * Math.cos(caseAngle);
          const y = domainY + (clusterRadius + levelOffset + jitter) * Math.sin(caseAngle);
          
          nodes.push({
            id: caseItem.id,
            label: caseItem.name_abbreviation || 
              (caseItem.name.length > 20 ? caseItem.name.substring(0, 18) + '...' : caseItem.name),
            type: 'case',
            x: Math.max(40, Math.min(width - 40, x)),
            y: Math.max(40, Math.min(height - 40, y)),
            color: getCourtColor(caseItem.court),
            court: caseItem.court,
            date: caseItem.decision_date,
            jurisdiction: caseItem.jurisdiction,
            size: courtLevel === 0 ? 14 : courtLevel === 1 ? 11 : 9,
          });

          // Connect case to its domain
          edges.push({
            id: `belongs-${caseItem.id}`,
            source: caseItem.id,
            target: `domain-${domain}`,
            type: 'belongs_to',
            weight: 0.3,
          });
        });
      });

      // Add citation edges
      citations.forEach(citation => {
        if (citation.citing_case_id && citation.cited_case_id &&
            caseIds.has(citation.citing_case_id) && caseIds.has(citation.cited_case_id)) {
          edges.push({
            id: `cite-${citation.id}`,
            source: citation.citing_case_id,
            target: citation.cited_case_id,
            type: 'cites',
            label: 'cites',
          });
        }
      });

      // Add similarity edges (only strong similarities)
      similarities.forEach(sim => {
        if (sim.case_a_id && sim.case_b_id && sim.similarity_score >= 0.75 &&
            caseIds.has(sim.case_a_id) && caseIds.has(sim.case_b_id)) {
          edges.push({
            id: `sim-${sim.id}`,
            source: sim.case_a_id,
            target: sim.case_b_id,
            type: 'similar',
            weight: sim.similarity_score,
            label: `${Math.round(sim.similarity_score * 100)}% similar`,
          });
        }
      });

      // Add contradiction edges
      contradictions.forEach(contra => {
        if (contra.case_a_id && contra.case_b_id &&
            caseIds.has(contra.case_a_id) && caseIds.has(contra.case_b_id)) {
          const isOverrule = contra.conflict_type?.toLowerCase().includes('overrule');
          edges.push({
            id: `contra-${contra.id}`,
            source: contra.case_a_id,
            target: contra.case_b_id,
            type: isOverrule ? 'overrules' : 'contradicts',
            weight: contra.confidence_score || undefined,
            label: contra.conflict_type,
          });
        }
      });

      return { nodes, edges };
    },
  });
};
