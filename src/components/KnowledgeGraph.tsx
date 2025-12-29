import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";

interface GraphNode {
  id: string;
  label: string;
  x: number;
  y: number;
  type: "case" | "concept" | "statute";
  color: string;
}

interface GraphEdge {
  source: string;
  target: string;
  type: "cites" | "overrules" | "distinguishes" | "related";
}

interface KnowledgeGraphProps {
  cases: Array<{
    title: string;
    tags: string[];
  }>;
}

const EDGE_COLORS = {
  cites: "hsl(var(--primary))",
  overrules: "hsl(var(--destructive))",
  distinguishes: "hsl(var(--warning, 45 93% 47%))",
  related: "hsl(var(--muted-foreground))",
};

export const KnowledgeGraph = ({ cases }: KnowledgeGraphProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 400 });
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  // Generate nodes from cases
  useEffect(() => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const width = rect.width || 600;
    const height = 400;
    setDimensions({ width, height });

    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.35;

    const generatedNodes: GraphNode[] = cases.slice(0, 8).map((c, i) => {
      const angle = (i / Math.min(cases.length, 8)) * 2 * Math.PI - Math.PI / 2;
      return {
        id: `case-${i}`,
        label: c.title.split(" v. ")[0] || c.title.substring(0, 15),
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
        type: "case" as const,
        color: `hsl(${(i * 45) % 360}, 70%, 50%)`,
      };
    });

    // Add some concept nodes
    const concepts = ["Due Process", "Equal Protection", "Judicial Review", "Civil Rights"];
    concepts.forEach((concept, i) => {
      const angle = ((i + 0.5) / concepts.length) * 2 * Math.PI;
      const innerRadius = radius * 0.5;
      generatedNodes.push({
        id: `concept-${i}`,
        label: concept,
        x: centerX + innerRadius * Math.cos(angle),
        y: centerY + innerRadius * Math.sin(angle),
        type: "concept",
        color: "hsl(var(--primary))",
      });
    });

    setNodes(generatedNodes);
  }, [cases]);

  // Generate edges
  const edges: GraphEdge[] = [
    { source: "case-0", target: "case-1", type: "cites" },
    { source: "case-1", target: "case-2", type: "related" },
    { source: "case-2", target: "case-0", type: "distinguishes" },
    { source: "case-3", target: "case-0", type: "cites" },
    { source: "case-4", target: "case-1", type: "cites" },
    { source: "case-5", target: "case-3", type: "overrules" },
    { source: "case-0", target: "concept-3", type: "related" },
    { source: "case-1", target: "concept-0", type: "related" },
    { source: "case-2", target: "concept-1", type: "related" },
    { source: "case-3", target: "concept-2", type: "related" },
    { source: "case-4", target: "concept-0", type: "related" },
  ];

  const handleMouseDown = (nodeId: string, e: React.MouseEvent) => {
    e.preventDefault();
    setDraggedNode(nodeId);
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      setOffset({
        x: e.clientX - node.x,
        y: e.clientY - node.y,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggedNode || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const newX = e.clientX - rect.left;
    const newY = e.clientY - rect.top;

    setNodes(prev => prev.map(node => 
      node.id === draggedNode 
        ? { ...node, x: newX, y: newY }
        : node
    ));
  };

  const handleMouseUp = () => {
    setDraggedNode(null);
  };

  const getNodeById = (id: string) => nodes.find(n => n.id === id);

  return (
    <Card className="animate-fade-in">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Knowledge Graph</CardTitle>
          <div className="flex gap-2">
            <Badge variant="outline" className="text-xs">
              <span className="w-2 h-2 rounded-full bg-primary mr-1.5 inline-block" />
              Cites
            </Badge>
            <Badge variant="outline" className="text-xs">
              <span className="w-2 h-2 rounded-full bg-destructive mr-1.5 inline-block" />
              Overrules
            </Badge>
            <Badge variant="outline" className="text-xs">
              <span className="w-2 h-2 rounded-full bg-yellow-500 mr-1.5 inline-block" />
              Distinguishes
            </Badge>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Drag nodes to explore · Click to view details
        </p>
      </CardHeader>
      <CardContent>
        <div 
          ref={containerRef}
          className="relative bg-muted/30 rounded-lg overflow-hidden cursor-grab active:cursor-grabbing"
          style={{ height: dimensions.height }}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <svg 
            width="100%" 
            height="100%" 
            viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
            className="select-none"
          >
            {/* Edges */}
            <g>
              {edges.map((edge, i) => {
                const source = getNodeById(edge.source);
                const target = getNodeById(edge.target);
                if (!source || !target) return null;
                
                const isHighlighted = hoveredNode === edge.source || hoveredNode === edge.target;
                
                return (
                  <line
                    key={i}
                    x1={source.x}
                    y1={source.y}
                    x2={target.x}
                    y2={target.y}
                    stroke={EDGE_COLORS[edge.type]}
                    strokeWidth={isHighlighted ? 2.5 : 1.5}
                    strokeOpacity={isHighlighted ? 1 : 0.4}
                    strokeDasharray={edge.type === "related" ? "4,4" : undefined}
                    className="transition-all duration-200"
                  />
                );
              })}
            </g>
            
            {/* Nodes */}
            <g>
              {nodes.map((node) => {
                const isHovered = hoveredNode === node.id;
                const isSelected = selectedNode?.id === node.id;
                const nodeRadius = node.type === "case" ? 28 : 20;
                
                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x}, ${node.y})`}
                    onMouseDown={(e) => handleMouseDown(node.id, e)}
                    onMouseEnter={() => setHoveredNode(node.id)}
                    onMouseLeave={() => setHoveredNode(null)}
                    onClick={() => setSelectedNode(isSelected ? null : node)}
                    className="cursor-pointer"
                  >
                    {/* Glow effect */}
                    {(isHovered || isSelected) && (
                      <circle
                        r={nodeRadius + 8}
                        fill={node.color}
                        opacity={0.2}
                        className="animate-pulse"
                      />
                    )}
                    
                    {/* Node circle */}
                    <circle
                      r={nodeRadius}
                      fill={node.type === "case" ? node.color : "hsl(var(--background))"}
                      stroke={node.color}
                      strokeWidth={node.type === "concept" ? 2 : 0}
                      className="transition-all duration-200"
                      style={{
                        transform: isHovered ? "scale(1.1)" : "scale(1)",
                        transformOrigin: "center",
                      }}
                    />
                    
                    {/* Node label */}
                    <text
                      textAnchor="middle"
                      dy="0.35em"
                      fontSize={node.type === "case" ? 9 : 8}
                      fontWeight={node.type === "case" ? 600 : 500}
                      fill={node.type === "case" ? "white" : "hsl(var(--foreground))"}
                      className="pointer-events-none"
                    >
                      {node.label.length > 12 ? node.label.substring(0, 10) + "..." : node.label}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>
          
          {/* Selected node info */}
          {selectedNode && (
            <div className="absolute bottom-4 left-4 right-4 bg-background/95 backdrop-blur border rounded-lg p-3 shadow-lg animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm">{selectedNode.label}</p>
                  <p className="text-xs text-muted-foreground capitalize">{selectedNode.type}</p>
                </div>
                <Badge variant="secondary">
                  {edges.filter(e => e.source === selectedNode.id || e.target === selectedNode.id).length} connections
                </Badge>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
