import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Slider } from "./ui/slider";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { useKnowledgeGraph, GraphNode, GraphEdge } from "@/hooks/useKnowledgeGraph";
import { useAddCase } from "@/hooks/useLegalCases";
import { Loader2, ZoomIn, ZoomOut, Maximize2, Info, BookOpen, Scale, AlertTriangle, Link2, Plus, X, FileText, GitBranch, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const EDGE_STYLES = {
  cites: { color: "hsl(220, 60%, 60%)", dash: "", arrow: true },
  overrules: { color: "hsl(0, 80%, 55%)", dash: "", arrow: true },
  similar: { color: "hsl(140, 60%, 50%)", dash: "6,4", arrow: false },
  contradicts: { color: "hsl(320, 70%, 55%)", dash: "4,4", arrow: false },
  belongs_to: { color: "hsl(0, 0%, 60%)", dash: "2,2", arrow: false },
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
  
  const containerRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null);
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [showDomainConnections, setShowDomainConnections] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
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
      await addCaseMutation.mutateAsync({
        case_id: `GRAPH-${Date.now()}`,
        name: newCase.name,
        court: newCase.court,
        jurisdiction: newCase.jurisdiction || undefined,
        decision_date: newCase.decision_date || undefined,
        docket_number: newCase.docket_number || undefined,
        summary: newCase.summary || undefined,
      });
      
      toast({ title: "Success", description: "Case added to graph" });
      setNewCase({ name: "", court: "", jurisdiction: "", decision_date: "", docket_number: "", summary: "" });
      setIsAddDialogOpen(false);
      refetch();
    } catch (err) {
      toast({ title: "Error", description: "Failed to add case", variant: "destructive" });
    }
  };

  // Filter edges based on visibility settings
  const visibleEdges = (data?.edges || []).filter(e => 
    showDomainConnections || e.type !== 'belongs_to'
  );

  // Stats for display
  const caseNodes = nodes.filter(n => n.type === 'case');
  const domainNodes = nodes.filter(n => n.type === 'domain');
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
                    placeholder="Case Summary"
                    value={newCase.summary}
                    onChange={(e) => setNewCase({ ...newCase, summary: e.target.value })}
                    rows={3}
                  />
                  <Button onClick={handleAddCase} disabled={addCaseMutation.isPending} className="w-full">
                    {addCaseMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Add to Graph
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
          {nodes.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
              <Info className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">No cases in database</p>
              <p className="text-sm">Generate synthetic cases or add cases manually</p>
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

                return (
                  <g key={edge.id}>
                    <line
                      x1={sourceNode.x}
                      y1={sourceNode.y}
                      x2={targetNode.x}
                      y2={targetNode.y}
                      stroke={style.color}
                      strokeWidth={isHovered ? 3 : isRelationship ? 2 : 1}
                      strokeOpacity={isHovered ? 1 : isRelationship ? 0.7 : 0.2}
                      strokeDasharray={style.dash}
                      markerEnd={style.arrow ? `url(#arrow-${edge.type})` : undefined}
                      onMouseEnter={() => setHoveredEdge(edge.id)}
                      onMouseLeave={() => setHoveredEdge(null)}
                      style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                    />
                    {isHovered && isRelationship && (
                      <g>
                        <rect
                          x={(sourceNode.x + targetNode.x) / 2 - 40}
                          y={(sourceNode.y + targetNode.y) / 2 - 12}
                          width="80"
                          height="20"
                          rx="4"
                          fill="hsl(var(--background))"
                          stroke={style.color}
                          strokeWidth="1"
                        />
                        <text
                          x={(sourceNode.x + targetNode.x) / 2}
                          y={(sourceNode.y + targetNode.y) / 2 + 2}
                          textAnchor="middle"
                          fontSize="10"
                          fill={style.color}
                          fontWeight="600"
                        >
                          {EDGE_LABELS[edge.type]?.label}
                          {edge.weight && ` ${(edge.weight * 100).toFixed(0)}%`}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}

              {/* Nodes */}
              {nodes.map(node => {
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
                {(selectedNode.summary || selectedNode.caseDetails?.summary) && (
                  <div className="mt-4 p-3 rounded bg-background/60 border border-border/30">
                    <div className="flex items-center gap-2 mb-2 text-sm font-medium">
                      <FileText className="w-4 h-4 text-primary" />
                      Summary
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {selectedNode.summary || selectedNode.caseDetails?.summary}
                    </p>
                  </div>
                )}
              </div>
              
              <div className="text-right">
                <div className="text-2xl font-bold text-primary">
                  {visibleEdges.filter(e => 
                    e.source === selectedNode.id || e.target === selectedNode.id
                  ).filter(e => e.type !== 'belongs_to').length}
                </div>
                <div className="text-xs text-muted-foreground">connections</div>
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

                {/* Contradictions */}
                <div className="p-3 rounded bg-background/60 border border-border/30">
                  <div className="flex items-center gap-2 mb-2 text-sm font-medium" style={{ color: EDGE_STYLES.contradicts.color }}>
                    <AlertTriangle className="w-4 h-4" />
                    Contradictions ({selectedNode.caseDetails.contradictions.length})
                  </div>
                  <div className="space-y-1 max-h-24 overflow-y-auto">
                    {selectedNode.caseDetails.contradictions.length > 0 ? (
                      selectedNode.caseDetails.contradictions.map(c => (
                        <div key={c.id} className="text-xs text-muted-foreground truncate hover:text-foreground cursor-pointer"
                          onClick={() => {
                            const node = nodes.find(n => n.id === c.id);
                            if (node) setSelectedNode(node);
                          }}
                        >
                          ⚠ {c.name.length > 25 ? c.name.substring(0, 23) + '...' : c.name}
                          <span className="text-destructive/70 ml-1">({c.type})</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-muted-foreground/50 italic">None</div>
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
