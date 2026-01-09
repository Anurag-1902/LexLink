import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Slider } from "./ui/slider";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { useKnowledgeGraph, GraphNode, GraphEdge } from "@/hooks/useKnowledgeGraph";
import { useAddCase, useAddCitation, useAddContradiction, useAddSimilarity, useSummarizeCase, useLegalCases } from "@/hooks/useLegalCases";
import { useDetectRelationships, useAutoCreateRelationships } from "@/hooks/useDetectRelationships";
import { Loader2, ZoomIn, ZoomOut, Maximize2, Info, BookOpen, Scale, AlertTriangle, Link2, Plus, X, FileText, GitBranch, Users, ArrowRight, Sparkles, Brain } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Label } from "./ui/label";
import { GraphFiltersComponent, GraphFilters } from "./GraphFilters";

const EDGE_STYLES = {
  cites: { color: "hsl(220, 60%, 60%)", dash: "", arrow: true, width: 2 },
  overrules: { color: "hsl(0, 80%, 55%)", dash: "", arrow: true, width: 4 },
  similar: { color: "hsl(140, 60%, 50%)", dash: "6,4", arrow: false, width: 2 },
  contradicts: { color: "hsl(320, 70%, 55%)", dash: "", arrow: false, width: 3 },
  belongs_to: { color: "hsl(0, 0%, 60%)", dash: "2,2", arrow: false, width: 1 },
};

const CONFLICT_TYPES = {
  'Reasoning Reversal': { icon: '🔄', description: 'The court reversed its legal reasoning on a key issue' },
  'Temporal Conflict': { icon: '⏰', description: 'Earlier precedent conflicts with later ruling due to changed circumstances' },
  'Jurisdictional Divergence': { icon: '🗺️', description: 'Different jurisdictions reached opposite conclusions' },
  'Overruled': { icon: '⚖️', description: 'This case was explicitly overruled by a higher authority' },
  'Doctrinal Shift': { icon: '📜', description: 'Legal doctrine has evolved, making earlier ruling obsolete' },
};

const EDGE_LABELS: Record<string, { label: string; icon: typeof Link2 }> = {
  cites: { label: "Cites", icon: BookOpen },
  overrules: { label: "Overrules", icon: AlertTriangle },
  similar: { label: "Similar", icon: Link2 },
  contradicts: { label: "Contradicts", icon: AlertTriangle },
  belongs_to: { label: "Domain", icon: Scale },
};

const COURTS = [
  "Supreme Court of the United States",
  "U.S. Court of Appeals",
  "U.S. District Court",
  "State Supreme Court",
  "State Court of Appeals",
  "State Trial Court",
];

const JURISDICTIONS = ["Federal", "California", "New York", "Texas", "Florida", "Illinois", "Pennsylvania"];

export const KnowledgeGraph = () => {
  const { toast } = useToast();
  const [nodeLimit, setNodeLimit] = useState(30);
  const { data, isLoading, error, refetch } = useKnowledgeGraph(nodeLimit);
  const addCaseMutation = useAddCase();
  const addCitationMutation = useAddCitation();
  const addContradictionMutation = useAddContradiction();
  const addSimilarityMutation = useAddSimilarity();
  const summarizeMutation = useSummarizeCase();
  const detectRelationshipsMutation = useDetectRelationships();
  const autoCreateRelationshipsMutation = useAutoCreateRelationships();
  const { data: allCases } = useLegalCases(100); // For dropdown
  
  const containerRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null);
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [showDomainConnections, setShowDomainConnections] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isRelationshipDialogOpen, setIsRelationshipDialogOpen] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isDetectingRelationships, setIsDetectingRelationships] = useState(false);
  const [isRunningBulkAI, setIsRunningBulkAI] = useState(false);
  const [bulkAIProgress, setBulkAIProgress] = useState({ current: 0, total: 0 });
  const [isDetectingSingleCase, setIsDetectingSingleCase] = useState(false);
  const [relationshipType, setRelationshipType] = useState<'citation' | 'contradiction' | 'similarity'>('citation');
  
  // Filters state
  const [filters, setFilters] = useState<GraphFilters>({
    searchQuery: "",
    courts: [],
    jurisdictions: [],
    dateRange: { start: "", end: "" },
    relationshipTypes: [],
  });
  
  const [newRelationship, setNewRelationship] = useState({
    sourceId: '',
    targetId: '',
    conflictType: '',
    description: '',
    score: 0.8,
  });
  const [newCase, setNewCase] = useState({
    name: "",
    court: "",
    jurisdiction: "",
    decision_date: "",
    docket_number: "",
    summary: "",
  });

  useEffect(() => {
    if (data?.nodes) {
      setNodes(data.nodes);
    }
  }, [data]);

  const handleMouseDown = useCallback((nodeId: string, e: React.MouseEvent) => {
    e.preventDefault();
    setDraggedNode(nodeId);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!draggedNode || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    setNodes(prevNodes =>
      prevNodes.map(node =>
        node.id === draggedNode ? { ...node, x, y } : node
      )
    );
  }, [draggedNode, zoom]);

  const handleMouseUp = useCallback(() => {
    setDraggedNode(null);
  }, []);

  const handleNodeClick = useCallback((node: GraphNode) => {
    setSelectedNode(node.id === selectedNode?.id ? null : node);
  }, [selectedNode]);

  const getNodeById = useCallback((id: string) => {
    return nodes.find(n => n.id === id);
  }, [nodes]);

  const handleZoomIn = () => setZoom(z => Math.min(z + 0.2, 2.5));
  const handleZoomOut = () => setZoom(z => Math.max(z - 0.2, 0.4));
  const handleReset = () => setZoom(1);

  const handleAddCase = async () => {
    if (!newCase.name || !newCase.court) {
      toast({ title: "Error", description: "Case name and court are required", variant: "destructive" });
      return;
    }
    
    try {
      setIsSummarizing(true);
      const addedCase = await addCaseMutation.mutateAsync({
        case_id: `GRAPH-${Date.now()}`,
        name: newCase.name,
        court: newCase.court,
        jurisdiction: newCase.jurisdiction || undefined,
        decision_date: newCase.decision_date || undefined,
        docket_number: newCase.docket_number || undefined,
        summary: newCase.summary || undefined,
      });
      
      let finalSummary = newCase.summary;
      
      // Generate AI summary if no manual summary was provided
      if (!newCase.summary && addedCase?.id) {
        toast({ title: "Generating AI Summary", description: "Creating an intelligent case summary..." });
        try {
          const result = await summarizeMutation.mutateAsync({
            caseId: addedCase.id,
            caseName: newCase.name,
            court: newCase.court,
            jurisdiction: newCase.jurisdiction || undefined,
          });
          finalSummary = result?.summary;
          toast({ title: "Summary Generated", description: "AI summary has been added to the case." });
        } catch (sumError) {
          console.error("Summarization failed:", sumError);
        }
      }
      
      // AI-powered relationship detection
      if (addedCase?.id) {
        setIsDetectingRelationships(true);
        toast({ title: "Detecting Relationships", description: "AI is analyzing case relationships..." });
        try {
          const detectionResult = await detectRelationshipsMutation.mutateAsync({
            newCaseId: addedCase.id,
            newCaseName: newCase.name,
            newCaseSummary: finalSummary,
            newCaseCourt: newCase.court,
            newCaseJurisdiction: newCase.jurisdiction || undefined,
          });
          
          if (detectionResult.relationships) {
            const { citations, similarities, contradictions } = detectionResult.relationships;
            const totalFound = (citations?.length || 0) + (similarities?.length || 0) + (contradictions?.length || 0);
            
            if (totalFound > 0) {
              // Auto-create the detected relationships
              await autoCreateRelationshipsMutation.mutateAsync({
                newCaseId: addedCase.id,
                relationships: detectionResult.relationships,
              });
            } else {
              toast({ title: "Analysis Complete", description: "No related cases found in the dataset." });
            }
          }
        } catch (detectError) {
          console.error("Relationship detection failed:", detectError);
          toast({ title: "Note", description: "Case added but relationship detection was skipped.", variant: "default" });
        } finally {
          setIsDetectingRelationships(false);
        }
      }
      
      toast({ title: "Success", description: "Case added to graph with AI analysis" });
      setNewCase({ name: "", court: "", jurisdiction: "", decision_date: "", docket_number: "", summary: "" });
      setIsAddDialogOpen(false);
      refetch();
    } catch (err) {
      toast({ title: "Error", description: "Failed to add case", variant: "destructive" });
    } finally {
      setIsSummarizing(false);
      setIsDetectingRelationships(false);
    }
  };

  // Bulk AI relationship detection for all cases
  const handleBulkAIDetection = async () => {
    if (!allCases || allCases.length < 2) {
      toast({ title: "Not enough cases", description: "Need at least 2 cases to detect relationships", variant: "destructive" });
      return;
    }

    setIsRunningBulkAI(true);
    setBulkAIProgress({ current: 0, total: allCases.length });
    
    let totalCreated = { citations: 0, similarities: 0, contradictions: 0 };
    
    try {
      toast({ title: "AI Analysis Started", description: `Analyzing ${allCases.length} cases for relationships...` });
      
      for (let i = 0; i < allCases.length; i++) {
        const caseItem = allCases[i];
        setBulkAIProgress({ current: i + 1, total: allCases.length });
        
        try {
          const detection = await detectRelationshipsMutation.mutateAsync({
            newCaseId: caseItem.id,
            newCaseName: caseItem.name,
            newCaseSummary: caseItem.summary || undefined,
            newCaseCourt: caseItem.court,
            newCaseJurisdiction: caseItem.jurisdiction || undefined,
          });
          
          if (detection.relationships) {
            const { citations, similarities, contradictions } = detection.relationships;
            const total = (citations?.length || 0) + (similarities?.length || 0) + (contradictions?.length || 0);
            
            if (total > 0) {
              const results = await autoCreateRelationshipsMutation.mutateAsync({
                newCaseId: caseItem.id,
                relationships: detection.relationships,
              });
              totalCreated.citations += results.citations;
              totalCreated.similarities += results.similarities;
              totalCreated.contradictions += results.contradictions;
            }
          }
        } catch (caseError) {
          console.error(`Failed to analyze case ${caseItem.name}:`, caseError);
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      const grandTotal = totalCreated.citations + totalCreated.similarities + totalCreated.contradictions;
      toast({ 
        title: "AI Analysis Complete", 
        description: `Created ${grandTotal} relationships: ${totalCreated.citations} citations, ${totalCreated.similarities} similarities, ${totalCreated.contradictions} contradictions`
      });
      
      refetch();
    } catch (error) {
      console.error("Bulk AI detection failed:", error);
      toast({ title: "Analysis failed", description: "Some cases could not be analyzed", variant: "destructive" });
    } finally {
      setIsRunningBulkAI(false);
      setBulkAIProgress({ current: 0, total: 0 });
    }
  };

  // Single case AI relationship detection
  const handleSingleCaseAIDetection = async (caseNode: GraphNode) => {
    if (!caseNode.caseDetails || !allCases || allCases.length < 2) {
      toast({ title: "Cannot detect", description: "Not enough cases to detect relationships", variant: "destructive" });
      return;
    }

    setIsDetectingSingleCase(true);
    
    try {
      toast({ title: "AI Analysis Started", description: `Analyzing "${caseNode.caseDetails.name}" for relationships...` });
      
      const detection = await detectRelationshipsMutation.mutateAsync({
        newCaseId: caseNode.id,
        newCaseName: caseNode.caseDetails.name,
        newCaseSummary: caseNode.caseDetails.summary || undefined,
        newCaseCourt: caseNode.caseDetails.court,
        newCaseJurisdiction: caseNode.caseDetails.jurisdiction || undefined,
      });
      
      if (detection.relationships) {
        const { citations, similarities, contradictions } = detection.relationships;
        const total = (citations?.length || 0) + (similarities?.length || 0) + (contradictions?.length || 0);
        
        if (total > 0) {
          const results = await autoCreateRelationshipsMutation.mutateAsync({
            newCaseId: caseNode.id,
            relationships: detection.relationships,
          });
          
          const grandTotal = results.citations + results.similarities + results.contradictions;
          toast({ 
            title: "Relationships Detected", 
            description: `Created ${grandTotal} relationships: ${results.citations} citations, ${results.similarities} similarities, ${results.contradictions} contradictions`
          });
          
          refetch();
        } else {
          toast({ title: "No relationships found", description: "AI did not detect any new relationships for this case" });
        }
      }
    } catch (error) {
      console.error("Single case AI detection failed:", error);
      toast({ title: "Analysis failed", description: "Could not analyze case relationships", variant: "destructive" });
    } finally {
      setIsDetectingSingleCase(false);
    }
  };

  const handleAddRelationship = async () => {
    if (!newRelationship.sourceId || !newRelationship.targetId) {
      toast({ title: "Error", description: "Please select both cases", variant: "destructive" });
      return;
    }
    if (newRelationship.sourceId === newRelationship.targetId) {
      toast({ title: "Error", description: "Cannot create relationship with same case", variant: "destructive" });
      return;
    }
    
    try {
      if (relationshipType === 'citation') {
        await addCitationMutation.mutateAsync({
          citing_case_id: newRelationship.sourceId,
          cited_case_id: newRelationship.targetId,
        });
      } else if (relationshipType === 'contradiction') {
        if (!newRelationship.conflictType) {
          toast({ title: "Error", description: "Please select a conflict type", variant: "destructive" });
          return;
        }
        await addContradictionMutation.mutateAsync({
          case_a_id: newRelationship.sourceId,
          case_b_id: newRelationship.targetId,
          conflict_type: newRelationship.conflictType,
          confidence_score: newRelationship.score,
          description: newRelationship.description || undefined,
        });
      } else {
        await addSimilarityMutation.mutateAsync({
          case_a_id: newRelationship.sourceId,
          case_b_id: newRelationship.targetId,
          similarity_score: newRelationship.score,
        });
      }
      
      setNewRelationship({ sourceId: '', targetId: '', conflictType: '', description: '', score: 0.8 });
      setIsRelationshipDialogOpen(false);
      refetch();
    } catch (err) {
      toast({ title: "Error", description: "Failed to add relationship", variant: "destructive" });
    }
  };

  // Extract available courts and jurisdictions from data
  const availableCourts = useMemo(() => {
    const courts = new Set<string>();
    nodes.forEach((n) => {
      if (n.type === "case" && n.caseDetails?.court) {
        courts.add(n.caseDetails.court);
      }
    });
    return Array.from(courts);
  }, [nodes]);

  const availableJurisdictions = useMemo(() => {
    const jurisdictions = new Set<string>();
    nodes.forEach((n) => {
      if (n.type === "case" && n.caseDetails?.jurisdiction) {
        jurisdictions.add(n.caseDetails.jurisdiction);
      }
    });
    return Array.from(jurisdictions);
  }, [nodes]);

  // Filter nodes based on search and filters
  const filteredNodes = useMemo(() => {
    return nodes.filter((node) => {
      if (node.type !== "case") return showDomainConnections;

      const caseDetails = node.caseDetails;
      if (!caseDetails) return false;

      // Search query filter - enhanced to search through all relevant fields
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase().trim();
        // Split query into terms for better matching (e.g., "theft fraud" matches cases with either)
        const searchTerms = query.split(/\s+/).filter(term => term.length > 0);
        
        // Build searchable text from all relevant fields
        const searchableText = [
          caseDetails.name,
          caseDetails.summary,
          caseDetails.court,
          caseDetails.jurisdiction,
          caseDetails.fullText,
          caseDetails.headnotes,
        ].filter(Boolean).join(' ').toLowerCase();
        
        // Match if any search term is found
        const matchesSearch = searchTerms.some(term => searchableText.includes(term));
        if (!matchesSearch) return false;
      }

      // Court filter
      if (filters.courts.length > 0 && caseDetails.court) {
        if (!filters.courts.includes(caseDetails.court)) return false;
      }

      // Jurisdiction filter
      if (filters.jurisdictions.length > 0 && caseDetails.jurisdiction) {
        if (!filters.jurisdictions.includes(caseDetails.jurisdiction)) return false;
      }

      // Date range filter
      if (filters.dateRange.start || filters.dateRange.end) {
        const caseDate = caseDetails.decision_date ? new Date(caseDetails.decision_date) : null;
        if (!caseDate) return false;
        if (filters.dateRange.start && caseDate < new Date(filters.dateRange.start)) return false;
        if (filters.dateRange.end && caseDate > new Date(filters.dateRange.end)) return false;
      }

      return true;
    });
  }, [nodes, filters, showDomainConnections]);

  // Get filtered node IDs for edge filtering
  const filteredNodeIds = useMemo(() => new Set(filteredNodes.map((n) => n.id)), [filteredNodes]);

  // Filter edges based on visibility settings and relationship type filters
  const visibleEdges = useMemo(() => {
    return (data?.edges || []).filter((e) => {
      // Hide domain connections unless shown
      if (e.type === "belongs_to" && !showDomainConnections) return false;

      // Both source and target must be in filtered nodes
      if (!filteredNodeIds.has(e.source) || !filteredNodeIds.has(e.target)) return false;

      // Relationship type filter
      if (filters.relationshipTypes.length > 0 && e.type !== "belongs_to") {
        if (!filters.relationshipTypes.includes(e.type)) return false;
      }

      return true;
    });
  }, [data?.edges, filteredNodeIds, showDomainConnections, filters.relationshipTypes]);

  // All case nodes for dropdowns - use both graph nodes and database cases for freshest data
  const allCaseNodes = useMemo(() => nodes.filter(n => n.type === 'case'), [nodes]);
  
  // Combined list: prefer database cases (fresher) but fallback to graph nodes
  const dropdownCases = useMemo(() => {
    if (allCases && allCases.length > 0) {
      return allCases.map(c => ({ id: c.id, name: c.name, court: c.court }));
    }
    return allCaseNodes.map(n => ({ id: n.id, name: n.caseDetails?.name || n.label, court: n.caseDetails?.court }));
  }, [allCases, allCaseNodes]);

  // Stats for display (filtered)
  const caseNodes = filteredNodes.filter(n => n.type === 'case');
  const domainNodes = filteredNodes.filter(n => n.type === 'domain');
  const citationEdges = visibleEdges.filter(e => e.type === 'cites');
  const similarEdges = visibleEdges.filter(e => e.type === 'similar');
  const contradictEdges = visibleEdges.filter(e => e.type === 'contradicts' || e.type === 'overrules');

  if (isLoading) {
    return (
      <Card className="animate-fade-in">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
            Knowledge Graph
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[500px] flex items-center justify-center bg-muted/30 rounded-lg">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Building knowledge graph...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="animate-fade-in">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Knowledge Graph</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[500px] flex items-center justify-center text-destructive bg-muted/30 rounded-lg">
            Error loading graph. Generate some cases first!
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="animate-fade-in">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Scale className="w-5 h-5 text-primary" />
              Legal Case Knowledge Graph
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Interactive visualization showing case relationships, citations, similarities & contradictions
            </p>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1">
                  <Plus className="h-4 w-4" /> Add Case
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add Case to Graph</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <Input
                    placeholder="Case Name (e.g., Smith v. Jones)"
                    value={newCase.name}
                    onChange={(e) => setNewCase({ ...newCase, name: e.target.value })}
                  />
                  <Select value={newCase.court} onValueChange={(v) => setNewCase({ ...newCase, court: v })}>
                    <SelectTrigger><SelectValue placeholder="Select Court" /></SelectTrigger>
                    <SelectContent>
                      {COURTS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={newCase.jurisdiction} onValueChange={(v) => setNewCase({ ...newCase, jurisdiction: v })}>
                    <SelectTrigger><SelectValue placeholder="Select Jurisdiction" /></SelectTrigger>
                    <SelectContent>
                      {JURISDICTIONS.map(j => <SelectItem key={j} value={j}>{j}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input
                    type="date"
                    value={newCase.decision_date}
                    onChange={(e) => setNewCase({ ...newCase, decision_date: e.target.value })}
                  />
                  <Textarea
                    placeholder="Case Summary (leave empty for AI-generated summary)"
                    value={newCase.summary}
                    onChange={(e) => setNewCase({ ...newCase, summary: e.target.value })}
                    rows={3}
                  />
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Sparkles className="h-3 w-3" />
                    <span>AI will auto-generate summary and detect relationships</span>
                  </div>
                  <Button onClick={handleAddCase} disabled={addCaseMutation.isPending || isSummarizing || isDetectingRelationships} className="w-full">
                    {(addCaseMutation.isPending || isSummarizing || isDetectingRelationships) ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Brain className="h-4 w-4 mr-2" />}
                    {isSummarizing ? "Generating Summary..." : isDetectingRelationships ? "Detecting Relationships..." : "Add with AI Analysis"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            
            {/* AI Bulk Detection Button */}
            <Button 
              size="sm" 
              variant="secondary" 
              className="gap-1 bg-gradient-to-r from-primary/20 to-primary/10 hover:from-primary/30 hover:to-primary/20"
              onClick={handleBulkAIDetection}
              disabled={isRunningBulkAI || !allCases || allCases.length < 2}
            >
              {isRunningBulkAI ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Analyzing {bulkAIProgress.current}/{bulkAIProgress.total}</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>AI Detect All</span>
                </>
              )}
            </Button>
            
            {/* Add Relationship Dialog */}
            <Dialog open={isRelationshipDialogOpen} onOpenChange={setIsRelationshipDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1">
                  <Link2 className="h-4 w-4" /> Add Relationship
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Create Case Relationship</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-2 block">Relationship Type</Label>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={relationshipType === 'citation' ? 'default' : 'outline'}
                        onClick={() => setRelationshipType('citation')}
                        className="flex-1"
                      >
                        <BookOpen className="h-3 w-3 mr-1" /> Citation
                      </Button>
                      <Button
                        size="sm"
                        variant={relationshipType === 'contradiction' ? 'default' : 'outline'}
                        onClick={() => setRelationshipType('contradiction')}
                        className="flex-1"
                        style={relationshipType === 'contradiction' ? { background: EDGE_STYLES.contradicts.color } : {}}
                      >
                        <AlertTriangle className="h-3 w-3 mr-1" /> Contradiction
                      </Button>
                      <Button
                        size="sm"
                        variant={relationshipType === 'similarity' ? 'default' : 'outline'}
                        onClick={() => setRelationshipType('similarity')}
                        className="flex-1"
                        style={relationshipType === 'similarity' ? { background: EDGE_STYLES.similar.color } : {}}
                      >
                        <Users className="h-3 w-3 mr-1" /> Similar
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <Label className="text-xs text-muted-foreground mb-1 block">
                        {relationshipType === 'citation' ? 'Citing Case' : 'Case A'}
                      </Label>
                      <Select 
                        value={newRelationship.sourceId} 
                        onValueChange={(v) => setNewRelationship({ ...newRelationship, sourceId: v })}
                      >
                        <SelectTrigger><SelectValue placeholder="Select case" /></SelectTrigger>
                        <SelectContent>
                          {dropdownCases.map(c => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground mt-5" />
                    <div className="flex-1">
                      <Label className="text-xs text-muted-foreground mb-1 block">
                        {relationshipType === 'citation' ? 'Cited Case' : 'Case B'}
                      </Label>
                      <Select 
                        value={newRelationship.targetId} 
                        onValueChange={(v) => setNewRelationship({ ...newRelationship, targetId: v })}
                      >
                        <SelectTrigger><SelectValue placeholder="Select case" /></SelectTrigger>
                        <SelectContent>
                          {dropdownCases.map(c => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  {relationshipType === 'contradiction' && (
                    <>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">Conflict Type</Label>
                        <Select 
                          value={newRelationship.conflictType} 
                          onValueChange={(v) => setNewRelationship({ ...newRelationship, conflictType: v })}
                        >
                          <SelectTrigger><SelectValue placeholder="Select conflict type" /></SelectTrigger>
                          <SelectContent>
                            {Object.entries(CONFLICT_TYPES).map(([type, { icon, description }]) => (
                              <SelectItem key={type} value={type}>
                                <div className="flex items-center gap-2">
                                  <span>{icon}</span>
                                  <span>{type}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {newRelationship.conflictType && CONFLICT_TYPES[newRelationship.conflictType as keyof typeof CONFLICT_TYPES] && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {CONFLICT_TYPES[newRelationship.conflictType as keyof typeof CONFLICT_TYPES].description}
                          </p>
                        )}
                      </div>
                      <Textarea
                        placeholder="Describe the contradiction..."
                        value={newRelationship.description}
                        onChange={(e) => setNewRelationship({ ...newRelationship, description: e.target.value })}
                        rows={2}
                      />
                    </>
                  )}
                  
                  {(relationshipType === 'contradiction' || relationshipType === 'similarity') && (
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">
                        {relationshipType === 'contradiction' ? 'Confidence Score' : 'Similarity Score'}: {Math.round(newRelationship.score * 100)}%
                      </Label>
                      <Slider
                        value={[newRelationship.score]}
                        onValueChange={([v]) => setNewRelationship({ ...newRelationship, score: v })}
                        min={0.5}
                        max={1}
                        step={0.05}
                      />
                    </div>
                  )}
                  
                  <Button 
                    onClick={handleAddRelationship} 
                    disabled={addCitationMutation.isPending || addContradictionMutation.isPending || addSimilarityMutation.isPending} 
                    className="w-full"
                  >
                    {(addCitationMutation.isPending || addContradictionMutation.isPending || addSimilarityMutation.isPending) && (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    )}
                    Create {relationshipType.charAt(0).toUpperCase() + relationshipType.slice(1)}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Cases:</span>
              <Slider
                value={[nodeLimit]}
                onValueChange={([v]) => setNodeLimit(v)}
                min={10}
                max={100}
                step={10}
                className="w-20"
              />
              <span className="w-6 text-xs">{nodeLimit}</span>
            </div>
            <Button 
              variant={showDomainConnections ? "secondary" : "ghost"} 
              size="sm"
              onClick={() => setShowDomainConnections(!showDomainConnections)}
              className="text-xs"
            >
              {showDomainConnections ? "Hide" : "Show"} Domains
            </Button>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={handleZoomOut} className="h-8 w-8">
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleZoomIn} className="h-8 w-8">
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleReset} className="h-8 w-8">
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        
        {/* Enhanced Legend */}
        <div className="flex flex-wrap gap-4 mt-4 p-3 bg-muted/30 rounded-lg text-xs">
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground font-semibold">Court Level:</span>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded-full border-2" style={{ background: 'hsl(45, 100%, 50%)' }} />
              <span>Supreme</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full" style={{ background: 'hsl(200, 70%, 55%)' }} />
              <span>Appeals</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'hsl(160, 55%, 50%)' }} />
              <span>District</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground font-semibold">Relationships:</span>
            <div className="flex items-center gap-1">
              <div className="w-5 h-0.5" style={{ background: EDGE_STYLES.cites.color }} />
              <BookOpen className="w-3 h-3" style={{ color: EDGE_STYLES.cites.color }} />
              <span>Cites</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-5 h-0.5" style={{ background: EDGE_STYLES.similar.color, borderTop: '2px dashed' }} />
              <span style={{ color: EDGE_STYLES.similar.color }}>Similar</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-5 h-0.5" style={{ background: EDGE_STYLES.contradicts.color }} />
              <AlertTriangle className="w-3 h-3" style={{ color: EDGE_STYLES.contradicts.color }} />
              <span>Contradicts</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-5 h-0.5" style={{ background: EDGE_STYLES.overrules.color }} />
              <span style={{ color: EDGE_STYLES.overrules.color }}>Overrules</span>
            </div>
          </div>
        </div>
        
        {/* Filters and Search */}
        <div className="mt-3">
          <GraphFiltersComponent
            filters={filters}
            onFiltersChange={setFilters}
            availableCourts={availableCourts}
            availableJurisdictions={availableJurisdictions}
          />
          {(filters.searchQuery || filters.courts.length > 0 || filters.jurisdictions.length > 0 || filters.relationshipTypes.length > 0 || filters.dateRange.start || filters.dateRange.end) && (
            <p className="text-xs text-muted-foreground mt-2">
              Showing {caseNodes.length} case{caseNodes.length !== 1 ? 's' : ''} • {citationEdges.length} citation{citationEdges.length !== 1 ? 's' : ''} • {similarEdges.length} similar • {contradictEdges.length} contradiction{contradictEdges.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <div
          ref={containerRef}
          className="relative bg-gradient-to-br from-muted/40 to-muted/20 rounded-lg overflow-hidden cursor-grab active:cursor-grabbing border border-border/50"
          style={{ height: 500 }}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {filteredNodes.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
              <Info className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">{nodes.length === 0 ? "No cases in database" : "No matching cases"}</p>
              <p className="text-sm">{nodes.length === 0 ? "Generate synthetic cases or add cases manually" : "Try adjusting your filters"}</p>
            </div>
          ) : (
            <svg
              width="100%"
              height="100%"
              viewBox="0 0 800 500"
              style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}
              className="transition-transform duration-200"
            >
              <defs>
                {/* Arrow markers for each edge type */}
                {Object.entries(EDGE_STYLES).map(([type, style]) => (
                  style.arrow && (
                    <marker
                      key={`arrow-${type}`}
                      id={`arrow-${type}`}
                      markerWidth="8"
                      markerHeight="6"
                      refX="7"
                      refY="3"
                      orient="auto"
                    >
                      <polygon points="0 0, 8 3, 0 6" fill={style.color} />
                    </marker>
                  )
                ))}
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
                <filter id="shadow">
                  <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.3"/>
                </filter>
              </defs>

              {/* Edges */}
                {visibleEdges.map(edge => {
                  const sourceNode = getNodeById(edge.source);
                  const targetNode = getNodeById(edge.target);
                  if (!sourceNode || !targetNode) return null;

                  const isHovered = hoveredEdge === edge.id;
                  const style = EDGE_STYLES[edge.type];
                  const isRelationship = edge.type !== 'belongs_to';
                  const isContradiction = edge.type === 'contradicts' || edge.type === 'overrules';
                  
                  // Calculate midpoint for labels
                  const midX = (sourceNode.x + targetNode.x) / 2;
                  const midY = (sourceNode.y + targetNode.y) / 2;

                  return (
                    <g key={edge.id}>
                      {/* Glow effect for contradictions */}
                      {isContradiction && (
                        <line
                          x1={sourceNode.x}
                          y1={sourceNode.y}
                          x2={targetNode.x}
                          y2={targetNode.y}
                          stroke={style.color}
                          strokeWidth={isHovered ? 10 : 6}
                          strokeOpacity={0.2}
                          className="animate-pulse"
                        />
                      )}
                      <line
                        x1={sourceNode.x}
                        y1={sourceNode.y}
                        x2={targetNode.x}
                        y2={targetNode.y}
                        stroke={style.color}
                        strokeWidth={isHovered ? style.width + 2 : style.width}
                        strokeOpacity={isHovered ? 1 : isRelationship ? 0.8 : 0.2}
                        strokeDasharray={style.dash}
                        markerEnd={style.arrow ? `url(#arrow-${edge.type})` : undefined}
                        onMouseEnter={() => setHoveredEdge(edge.id)}
                        onMouseLeave={() => setHoveredEdge(null)}
                        style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                      />
                      {/* Contradiction type indicator */}
                      {isContradiction && !isHovered && (
                        <g>
                          <circle
                            cx={midX}
                            cy={midY}
                            r={10}
                            fill="hsl(var(--background))"
                            stroke={style.color}
                            strokeWidth="2"
                          />
                          <text
                            x={midX}
                            y={midY + 4}
                            textAnchor="middle"
                            fontSize="12"
                          >
                            {edge.type === 'overrules' ? '⚖️' : '⚠️'}
                          </text>
                        </g>
                      )}
                      {isHovered && isRelationship && (
                        <g>
                          <rect
                            x={midX - 60}
                            y={midY - 15}
                            width="120"
                            height={isContradiction ? "40" : "26"}
                            rx="4"
                            fill="hsl(var(--background))"
                            stroke={style.color}
                            strokeWidth="2"
                            filter="url(#shadow)"
                          />
                          <text
                            x={midX}
                            y={midY + (isContradiction ? -3 : 2)}
                            textAnchor="middle"
                            fontSize="11"
                            fill={style.color}
                            fontWeight="600"
                          >
                            {edge.conflictType || EDGE_LABELS[edge.type]?.label}
                          </text>
                          {isContradiction && edge.weight && (
                            <text
                              x={midX}
                              y={midY + 14}
                              textAnchor="middle"
                              fontSize="9"
                              fill="hsl(var(--muted-foreground))"
                            >
                              {Math.round(edge.weight * 100)}% confidence
                            </text>
                          )}
                        </g>
                      )}
                    </g>
                  );
                })}

              {/* Nodes */}
              {filteredNodes.map(node => {
                const isSelected = selectedNode?.id === node.id;
                const isHovered = hoveredNode === node.id;
                const isDomain = node.type === 'domain';
                const radius = node.size || (isDomain ? 18 : 10);

                return (
                  <g
                    key={node.id}
                    onMouseDown={(e) => handleMouseDown(node.id, e)}
                    onMouseEnter={() => setHoveredNode(node.id)}
                    onMouseLeave={() => setHoveredNode(null)}
                    onClick={() => handleNodeClick(node)}
                    style={{ cursor: draggedNode === node.id ? 'grabbing' : 'pointer' }}
                  >
                    {/* Glow effect for selected/hovered */}
                    {(isSelected || isHovered) && (
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={radius + 8}
                        fill="none"
                        stroke={node.color}
                        strokeWidth="3"
                        strokeOpacity="0.4"
                        filter="url(#glow)"
                      />
                    )}
                    
                    {/* Domain node shape (hexagon-ish) */}
                    {isDomain ? (
                      <g filter="url(#shadow)">
                        <circle
                          cx={node.x}
                          cy={node.y}
                          r={radius}
                          fill={node.color}
                          stroke="hsl(var(--background))"
                          strokeWidth="3"
                        />
                        <text
                          x={node.x}
                          y={node.y + 1}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fontSize="8"
                          fill="white"
                          fontWeight="700"
                        >
                          {node.label.split(' ')[0].substring(0, 4)}
                        </text>
                      </g>
                    ) : (
                      /* Case node */
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={radius}
                        fill={node.color}
                        stroke="hsl(var(--background))"
                        strokeWidth="2"
                        filter={isHovered ? "url(#shadow)" : undefined}
                        style={{ 
                          transition: 'all 0.2s',
                          transform: isHovered ? 'scale(1.2)' : 'scale(1)',
                          transformOrigin: `${node.x}px ${node.y}px`
                        }}
                      />
                    )}
                    
                    {/* Node label */}
                    <text
                      x={node.x}
                      y={node.y + radius + 12}
                      textAnchor="middle"
                      fontSize={isDomain ? "10" : "8"}
                      fill="currentColor"
                      fontWeight={isDomain ? "600" : "400"}
                      className="pointer-events-none"
                      style={{ opacity: isDomain ? 1 : 0.85 }}
                    >
                      {node.label.length > 20 ? node.label.substring(0, 18) + '...' : node.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          )}

          {/* Stats overlay */}
          <div className="absolute top-3 left-3 flex flex-wrap gap-2">
            <Badge variant="secondary" className="text-xs bg-background/80 backdrop-blur-sm">
              {caseNodes.length} cases
            </Badge>
            <Badge variant="secondary" className="text-xs bg-background/80 backdrop-blur-sm">
              {domainNodes.length} domains
            </Badge>
            <Badge className="text-xs" style={{ background: EDGE_STYLES.cites.color }}>
              {citationEdges.length} citations
            </Badge>
            <Badge className="text-xs" style={{ background: EDGE_STYLES.similar.color }}>
              {similarEdges.length} similar
            </Badge>
            {contradictEdges.length > 0 && (
              <Badge className="text-xs" style={{ background: EDGE_STYLES.contradicts.color }}>
                {contradictEdges.length} conflicts
              </Badge>
            )}
          </div>

          {/* Help text */}
          <div className="absolute bottom-3 right-3 text-xs text-muted-foreground bg-background/70 backdrop-blur-sm px-2 py-1 rounded">
            Drag nodes • Click for details • Scroll to zoom
          </div>
        </div>

        {/* Selected node details panel */}
        {selectedNode && (
          <div className="mt-4 p-4 rounded-lg bg-muted/50 border border-border animate-fade-in">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6" 
                    onClick={() => setSelectedNode(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  {selectedNode.type === 'domain' ? (
                    <Scale className="w-5 h-5" style={{ color: selectedNode.color }} />
                  ) : (
                    <BookOpen className="w-5 h-5" style={{ color: selectedNode.color }} />
                  )}
                  <h4 className="font-semibold text-foreground text-lg">
                    {selectedNode.caseDetails?.name || selectedNode.label}
                  </h4>
                </div>
                
                <div className="flex flex-wrap gap-2 mt-3">
                  <Badge style={{ backgroundColor: selectedNode.color, color: 'white' }}>
                    {selectedNode.type === 'domain' ? 'Legal Domain' : 'Case'}
                  </Badge>
                  {selectedNode.court && (
                    <Badge variant="outline">{selectedNode.court}</Badge>
                  )}
                  {selectedNode.jurisdiction && (
                    <Badge variant="outline">{selectedNode.jurisdiction}</Badge>
                  )}
                  {selectedNode.date && (
                    <Badge variant="secondary">
                      {new Date(selectedNode.date).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'short',
                        day: 'numeric'
                      })}
                    </Badge>
                  )}
                </div>

                {/* Summary Section */}
                {(selectedNode.summary || selectedNode.caseDetails?.summary) ? (
                  <div className="mt-4 p-3 rounded bg-background/60 border border-border/30">
                    <div className="flex items-center gap-2 mb-2 text-sm font-medium">
                      <FileText className="w-4 h-4 text-primary" />
                      Summary
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {selectedNode.summary || selectedNode.caseDetails?.summary}
                    </p>
                  </div>
                ) : selectedNode.type === 'case' && (
                  <div className="mt-4 p-3 rounded bg-background/60 border border-border/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <FileText className="w-4 h-4" />
                        No summary available
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline"
                        disabled={summarizeMutation.isPending}
                        onClick={async () => {
                          if (selectedNode.caseDetails) {
                            toast({ title: "Generating Summary", description: "AI is analyzing the case..." });
                            try {
                              await summarizeMutation.mutateAsync({
                                caseId: selectedNode.id,
                                caseName: selectedNode.caseDetails.name,
                                court: selectedNode.caseDetails.court,
                                jurisdiction: selectedNode.caseDetails.jurisdiction,
                                fullText: selectedNode.caseDetails.fullText,
                                headnotes: selectedNode.caseDetails.headnotes,
                              });
                              toast({ title: "Success", description: "AI summary generated!" });
                              refetch();
                            } catch (e) {
                              // Error handled by mutation
                            }
                          }
                        }}
                      >
                        {summarizeMutation.isPending ? (
                          <><Loader2 className="h-3 w-3 animate-spin mr-1" /> Generating...</>
                        ) : (
                          <>✨ Generate AI Summary</>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex flex-col items-end gap-2">
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary">
                    {visibleEdges.filter(e => 
                      e.source === selectedNode.id || e.target === selectedNode.id
                    ).filter(e => e.type !== 'belongs_to').length}
                  </div>
                  <div className="text-xs text-muted-foreground">connections</div>
                </div>
                
                {/* AI Detect Relationships Button */}
                {selectedNode.type === 'case' && selectedNode.caseDetails && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1 bg-gradient-to-r from-primary/10 to-primary/5 hover:from-primary/20 hover:to-primary/10 border-primary/20"
                    onClick={() => handleSingleCaseAIDetection(selectedNode)}
                    disabled={isDetectingSingleCase || !allCases || allCases.length < 2}
                  >
                    {isDetectingSingleCase ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Detecting...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3 w-3" />
                        Detect Relationships
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>

            {/* Detailed relationships for case nodes */}
            {selectedNode.type === 'case' && selectedNode.caseDetails && (
              <div className="mt-4 pt-4 border-t border-border/50 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Citations: This case cites */}
                <div className="p-3 rounded bg-background/60 border border-border/30">
                  <div className="flex items-center gap-2 mb-2 text-sm font-medium" style={{ color: EDGE_STYLES.cites.color }}>
                    <BookOpen className="w-4 h-4" />
                    Cites ({selectedNode.caseDetails.cites.length})
                  </div>
                  <div className="space-y-1 max-h-24 overflow-y-auto">
                    {selectedNode.caseDetails.cites.length > 0 ? (
                      selectedNode.caseDetails.cites.map(c => (
                        <div key={c.id} className="text-xs text-muted-foreground truncate hover:text-foreground cursor-pointer"
                          onClick={() => {
                            const node = nodes.find(n => n.id === c.id);
                            if (node) setSelectedNode(node);
                          }}
                        >
                          → {c.name.length > 30 ? c.name.substring(0, 28) + '...' : c.name}
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-muted-foreground/50 italic">None</div>
                    )}
                  </div>
                </div>

                {/* Cited By */}
                <div className="p-3 rounded bg-background/60 border border-border/30">
                  <div className="flex items-center gap-2 mb-2 text-sm font-medium" style={{ color: EDGE_STYLES.cites.color }}>
                    <GitBranch className="w-4 h-4" />
                    Cited By ({selectedNode.caseDetails.citedBy.length})
                  </div>
                  <div className="space-y-1 max-h-24 overflow-y-auto">
                    {selectedNode.caseDetails.citedBy.length > 0 ? (
                      selectedNode.caseDetails.citedBy.map(c => (
                        <div key={c.id} className="text-xs text-muted-foreground truncate hover:text-foreground cursor-pointer"
                          onClick={() => {
                            const node = nodes.find(n => n.id === c.id);
                            if (node) setSelectedNode(node);
                          }}
                        >
                          ← {c.name.length > 30 ? c.name.substring(0, 28) + '...' : c.name}
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-muted-foreground/50 italic">None</div>
                    )}
                  </div>
                </div>

                {/* Contradictions - Enhanced */}
                <div className="p-3 rounded bg-background/60 border-2 border-pink-500/30">
                  <div className="flex items-center gap-2 mb-2 text-sm font-medium" style={{ color: EDGE_STYLES.contradicts.color }}>
                    <AlertTriangle className="w-4 h-4" />
                    Contradictions ({selectedNode.caseDetails.contradictions.length})
                  </div>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {selectedNode.caseDetails.contradictions.length > 0 ? (
                      selectedNode.caseDetails.contradictions.map(c => (
                        <div key={c.id} className="p-2 rounded bg-pink-500/10 border border-pink-500/20 hover:bg-pink-500/20 cursor-pointer transition-colors"
                          onClick={() => {
                            const node = nodes.find(n => n.id === c.id);
                            if (node) setSelectedNode(node);
                          }}
                        >
                          <div className="text-xs font-medium text-foreground truncate">
                            ⚠️ {c.name.length > 30 ? c.name.substring(0, 28) + '...' : c.name}
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-xs px-1.5 py-0.5 rounded bg-pink-500/20 text-pink-400">{c.type}</span>
                            <span className="text-xs text-muted-foreground">{Math.round(c.confidence * 100)}% conf.</span>
                          </div>
                          {c.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{c.description}</p>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-muted-foreground/50 italic p-2 text-center">
                        No contradictions found
                      </div>
                    )}
                  </div>
                </div>

                {/* Similar Cases */}
                <div className="p-3 rounded bg-background/60 border border-border/30">
                  <div className="flex items-center gap-2 mb-2 text-sm font-medium" style={{ color: EDGE_STYLES.similar.color }}>
                    <Users className="w-4 h-4" />
                    Similar ({selectedNode.caseDetails.similarities.length})
                  </div>
                  <div className="space-y-1 max-h-24 overflow-y-auto">
                    {selectedNode.caseDetails.similarities.length > 0 ? (
                      selectedNode.caseDetails.similarities.map(c => (
                        <div key={c.id} className="text-xs text-muted-foreground truncate hover:text-foreground cursor-pointer"
                          onClick={() => {
                            const node = nodes.find(n => n.id === c.id);
                            if (node) setSelectedNode(node);
                          }}
                        >
                          ≈ {c.name.length > 25 ? c.name.substring(0, 23) + '...' : c.name}
                          <span className="text-green-600 ml-1">({Math.round(c.score * 100)}%)</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-muted-foreground/50 italic">None</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Simple connection breakdown for domain nodes */}
            {selectedNode.type === 'domain' && (
              <div className="mt-4 pt-3 border-t border-border/50 grid grid-cols-4 gap-3 text-center text-xs">
                {['cites', 'similar', 'contradicts', 'overrules'].map(type => {
                  const count = visibleEdges.filter(e => 
                    e.type === type && (e.source === selectedNode.id || e.target === selectedNode.id)
                  ).length;
                  const style = EDGE_STYLES[type as keyof typeof EDGE_STYLES];
                  return (
                    <div key={type} className="p-2 rounded bg-background/50">
                      <div className="font-semibold" style={{ color: style.color }}>{count}</div>
                      <div className="text-muted-foreground capitalize">{type}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
