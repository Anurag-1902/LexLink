import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { ArrowRight } from "lucide-react";

interface FeaturedCase {
  title: string;
  court: string;
  date: string;
  summary: string;
  tags: string[];
  citations: number;
  conflicts: number;
}

interface FeaturedAnalysisProps {
  case: FeaturedCase;
}

export const FeaturedAnalysis = ({ case: featuredCase }: FeaturedAnalysisProps) => {
  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="h-1 w-12 bg-accent rounded-full" />
        <h3 className="text-xs text-muted-foreground tracking-widest uppercase">
          Featured Analysis
        </h3>
      </div>
      
      <Card className="p-6 border-l-4 border-l-accent hover:shadow-lg transition-shadow">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h4 className="text-2xl font-bold mb-2 text-primary">
              {featuredCase.title}
            </h4>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span>{featuredCase.court}</span>
              <span>·</span>
              <span>{featuredCase.date}</span>
            </div>
          </div>
          {featuredCase.conflicts > 0 && (
            <Badge variant="destructive" className="bg-metric-red">
              {featuredCase.conflicts} Conflicts
            </Badge>
          )}
        </div>

        <p className="text-foreground mb-4 leading-relaxed">
          {featuredCase.summary}
        </p>

        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {featuredCase.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="rounded-full">
                {tag}
              </Badge>
            ))}
          </div>
          <button className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 font-medium transition-colors group">
            <span>{featuredCase.citations} citations</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </Card>
    </div>
  );
};
