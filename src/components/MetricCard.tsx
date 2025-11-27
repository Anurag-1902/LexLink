import { Card } from "./ui/card";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  value: string;
  label: string;
  variant: "blue" | "red" | "green" | "yellow";
}

export const MetricCard = ({ value, label, variant }: MetricCardProps) => {
  const variantStyles = {
    blue: "border-metric-blue/30 bg-metric-blue/5",
    red: "border-metric-red/30 bg-metric-red/5",
    green: "border-metric-green/30 bg-metric-green/5",
    yellow: "border-metric-yellow/30 bg-metric-yellow/5",
  };

  const textStyles = {
    blue: "text-metric-blue",
    red: "text-metric-red",
    green: "text-metric-green",
    yellow: "text-metric-yellow",
  };

  return (
    <Card className={cn("p-6 border-2", variantStyles[variant])}>
      <div className={cn("text-5xl font-bold mb-2", textStyles[variant])}>
        {value}
      </div>
      <div className="text-xs text-muted-foreground tracking-wider uppercase">
        {label}
      </div>
    </Card>
  );
};
