import { MetricCard } from "./MetricCard";

interface Metrics {
  totalCases: number;
  contradictions: number;
  graphNodes: number;
  similarityScore: number;
}

interface SystemMetricsProps {
  metrics: Metrics;
}

export const SystemMetrics = ({ metrics }: SystemMetricsProps) => {
  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="h-1 w-12 bg-metric-blue rounded-full" />
        <h3 className="text-xs text-muted-foreground tracking-widest uppercase">
          System Metrics
        </h3>
      </div>
      
      <div className="grid gap-4">
        <MetricCard
          value={metrics.totalCases.toLocaleString()}
          label="Total Cases Indexed"
          variant="blue"
        />
        <MetricCard
          value={metrics.contradictions.toLocaleString()}
          label="Contradictions Detected"
          variant="red"
        />
        <MetricCard
          value={metrics.graphNodes.toLocaleString()}
          label="Graph Nodes"
          variant="green"
        />
        <MetricCard
          value={`${metrics.similarityScore.toFixed(1)}%`}
          label="Avg Similarity Score"
          variant="yellow"
        />
      </div>
    </div>
  );
};
