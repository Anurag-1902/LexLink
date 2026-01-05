import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { FileText, Scale, AlertTriangle, Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SearchResult {
  id?: string;
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
  const [aiSummaries, setAiSummaries] = useState<Record<number, string>>({});
  const [loadingIndex, setLoadingIndex] = useState<number | null>(null);

  const generateAISummary = async (result: SearchResult, index: number) => {
    setLoadingIndex(index);
    
    try {
      const { data, error } = await supabase.functions.invoke('summarize-case', {
        body: {
          caseId: result.id || `search-result-${index}`,
          caseName: result.title,
          court: result.court,
          jurisdiction: null,
          fullText: result.summary, // Use existing summary as context
          headnotes: result.tags.join(", ")
        }
      });

      if (error) {
        if (error.message?.includes("429")) {
          toast.error("Rate limit exceeded. Please try again later.");
        } else if (error.message?.includes("402")) {
          toast.error("AI usage limit reached. Please add credits.");
        } else {
          throw error;
        }
        return;
      }

      if (data?.summary) {
        setAiSummaries(prev => ({ ...prev, [index]: data.summary }));
        toast.success("AI summary generated!");
      }
    } catch (error) {
      console.error("Error generating summary:", error);
      toast.error("Failed to generate AI summary");
    } finally {
      setLoadingIndex(null);
    }
  };

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
                
                {/* AI Summary Section */}
                {aiSummaries[index] ? (
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium text-primary">AI-Generated Summary</span>
                    </div>
                    <p className="text-sm text-foreground leading-relaxed">
                      {aiSummaries[index]}
                    </p>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => generateAISummary(result, index)}
                    disabled={loadingIndex !== null}
                    className="mb-4"
                  >
                    {loadingIndex === index ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate AI Summary
                      </>
                    )}
                  </Button>
                )}

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
