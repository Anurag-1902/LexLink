import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { FileText, Scale, AlertTriangle } from "lucide-react";

interface SearchResult {
  title: string;
  court: string;
  date: string;
  summary: string;
  tags: string[];
  citations: number;
  conflicts: number;
  relevanceScore: number;
}

interface SearchResultsProps {
  results: SearchResult[];
  query: string;
  onClose: () => void;
}

export const SearchResults = ({ results, query, onClose }: SearchResultsProps) => {
  if (results.length === 0) return null;

  return (
    <section className="bg-muted/50 border-y border-border py-8 px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-semibold">
              Search Results for "{query}"
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Found {results.length} semantically similar cases
            </p>
          </div>
          <button 
            onClick={onClose}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear results
          </button>
        </div>
        
        <div className="grid gap-4">
          {results.map((result, index) => (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Scale className="w-4 h-4 text-primary" />
                      {result.title}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {result.court} · {result.date}
                    </p>
                  </div>
                  <Badge variant="secondary" className="bg-primary/10 text-primary">
                    {Math.round(result.relevanceScore * 100)}% match
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {result.summary}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex gap-2 flex-wrap">
                    {result.tags.map((tag, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      {result.citations.toLocaleString()} citations
                    </span>
                    {result.conflicts > 0 && (
                      <span className="flex items-center gap-1 text-destructive">
                        <AlertTriangle className="w-3 h-3" />
                        {result.conflicts} conflicts
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
