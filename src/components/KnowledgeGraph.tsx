import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Slider } from "./ui/slider";
import { useKnowledgeGraph, GraphNode, GraphEdge } from "@/hooks/useKnowledgeGraph";
import { Loader2, ZoomIn, ZoomOut, Maximize2, Info } from "lucide-react";

const EDGE_COLORS = {
  cites: "hsl(220, 60%, 60%)",
  overrules: "hsl(0, 70%, 55%)",
  similar: "hsl(140, 60%, 45%)",
  contradicts: "hsl(280, 70%, 55%)",
};

const EDGE_LABELS = {
  cites: "Cites",
  overrules: "Overrules",
  similar: "Similar",
  contradicts: "Contradicts",
};

export const KnowledgeGraph = () => {
  const [nodeLimit, setNodeLimit] = useState(30);
  const { data, isLoading, error } = useKnowledgeGraph(nodeLimit);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null);
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);

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
          <div className="h-[400px] flex items-center justify-center bg-muted/30 rounded-lg">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading graph data...</span>
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
          <div className="h-[400px] flex items-center justify-center text-destructive bg-muted/30 rounded-lg">
            Error loading graph. Generate some cases first!
          </div>
        </CardContent>
      </Card>
    );
  }

  const edges = data?.edges || [];

  return (
    <Card className="animate-fade-in">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
              Interactive Knowledge Graph
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Dynamic visualization from database • Drag nodes • Click for details
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Nodes:</span>
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
        
        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground font-medium">Nodes:</span>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full" style={{ background: 'hsl(220, 70%, 50%)' }} />
              <span>Supreme</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full" style={{ background: 'hsl(200, 60%, 50%)' }} />
              <span>Appeals</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full" style={{ background: 'hsl(35, 90%, 50%)' }} />
              <span>Concept</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground font-medium">Edges:</span>
            {Object.entries(EDGE_COLORS).map(([type, color]) => (
              <div key={type} className="flex items-center gap-1">
                <div className="w-4 h-0.5" style={{ background: color }} />
                <span>{EDGE_LABELS[type as keyof typeof EDGE_LABELS]}</span>
              </div>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div
          ref={containerRef}
          className="relative bg-muted/30 rounded-lg overflow-hidden cursor-grab active:cursor-grabbing"
          style={{ height: 450 }}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {nodes.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
              <Info className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">No cases in database</p>
              <p className="text-sm">Generate synthetic cases to populate the knowledge graph</p>
            </div>
          ) : (
            <svg
              width="100%"
              height="100%"
              viewBox="0 0 800 450"
              style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}
              className="transition-transform duration-200"
            >
              <defs>
                <marker
                  id="arrowhead-cites"
                  markerWidth="6"
                  markerHeight="4"
                  refX="5"
                  refY="2"
                  orient="auto"
                >
                  <polygon points="0 0, 6 2, 0 4" fill={EDGE_COLORS.cites} />
                </marker>
                <marker
                  id="arrowhead-overrules"
                  markerWidth="6"
                  markerHeight="4"
                  refX="5"
                  refY="2"
                  orient="auto"
                >
                  <polygon points="0 0, 6 2, 0 4" fill={EDGE_COLORS.overrules} />
                </marker>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>

              {/* Edges */}
              {edges.map(edge => {
                const sourceNode = getNodeById(edge.source);
                const targetNode = getNodeById(edge.target);
                if (!sourceNode || !targetNode) return null;

                const isHovered = hoveredEdge === edge.id;
                const color = EDGE_COLORS[edge.type];

                return (
                  <g key={edge.id}>
                    <line
                      x1={sourceNode.x}
                      y1={sourceNode.y}
                      x2={targetNode.x}
                      y2={targetNode.y}
                      stroke={color}
                      strokeWidth={isHovered ? 3 : 1.5}
                      strokeOpacity={isHovered ? 1 : 0.5}
                      strokeDasharray={edge.type === 'similar' ? '4,4' : undefined}
                      markerEnd={edge.type === 'cites' || edge.type === 'overrules' 
                        ? `url(#arrowhead-${edge.type})` 
                        : undefined}
                      onMouseEnter={() => setHoveredEdge(edge.id)}
                      onMouseLeave={() => setHoveredEdge(null)}
                      style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                    />
                    {isHovered && (
                      <text
                        x={(sourceNode.x + targetNode.x) / 2}
                        y={(sourceNode.y + targetNode.y) / 2 - 8}
                        textAnchor="middle"
                        fontSize="10"
                        fill={color}
                        fontWeight="600"
                      >
                        {EDGE_LABELS[edge.type]}
                        {edge.weight && ` (${(edge.weight * 100).toFixed(0)}%)`}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Nodes */}
              {nodes.map(node => {
                const isSelected = selectedNode?.id === node.id;
                const isHovered = hoveredNode === node.id;
                const radius = node.type === 'concept' ? 14 : 12;

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
                        r={radius + 6}
                        fill="none"
                        stroke={node.color}
                        strokeWidth="2"
                        strokeOpacity="0.4"
                        filter="url(#glow)"
                      />
                    )}
                    
                    {/* Node circle */}
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={radius}
                      fill={node.type === 'case' ? node.color : 'hsl(var(--background))'}
                      stroke={node.color}
                      strokeWidth={node.type === 'concept' ? 2 : 0}
                      style={{ 
                        transition: 'all 0.2s',
                        transform: isHovered ? 'scale(1.15)' : 'scale(1)',
                        transformOrigin: `${node.x}px ${node.y}px`
                      }}
                    />
                    
                    {/* Node label */}
                    <text
                      x={node.x}
                      y={node.y + radius + 12}
                      textAnchor="middle"
                      fontSize="8"
                      fill="currentColor"
                      className="pointer-events-none"
                      style={{ opacity: 0.8 }}
                    >
                      {node.label.length > 18 ? node.label.substring(0, 16) + '...' : node.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          )}

          {/* Stats overlay */}
          <div className="absolute top-3 left-3 flex gap-2">
            <Badge variant="secondary" className="text-xs">
              {nodes.length} nodes
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {edges.length} edges
            </Badge>
          </div>
        </div>

        {/* Selected node details */}
        {selectedNode && (
          <div className="mt-4 p-4 rounded-lg bg-muted/50 border border-border/50 animate-fade-in">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-semibold text-foreground">
                  {selectedNode.label}
                </h4>
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedNode.court && (
                    <Badge variant="outline" className="text-xs">{selectedNode.court}</Badge>
                  )}
                  {selectedNode.jurisdiction && (
                    <Badge variant="outline" className="text-xs">{selectedNode.jurisdiction}</Badge>
                  )}
                  {selectedNode.date && (
                    <Badge variant="outline" className="text-xs">{selectedNode.date}</Badge>
                  )}
                  <Badge 
                    className="text-xs"
                    style={{ 
                      backgroundColor: selectedNode.color,
                      color: 'white'
                    }}
                  >
                    {selectedNode.type}
                  </Badge>
                </div>
              </div>
              <div className="text-right text-sm text-muted-foreground">
                <p>
                  Connections: {edges.filter(e => 
                    e.source === selectedNode.id || e.target === selectedNode.id
                  ).length}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
