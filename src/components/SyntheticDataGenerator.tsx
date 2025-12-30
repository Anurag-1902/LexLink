import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Database, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export const SyntheticDataGenerator = () => {
  const [count, setCount] = useState(500);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    generated?: number;
    errors?: number;
    citations?: number;
    contradictions?: number;
    similarities?: number;
    message?: string;
    error?: string;
  } | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleGenerate = async () => {
    setIsGenerating(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("generate-synthetic-cases", {
        body: { count },
      });

      if (error) throw error;

      setResult(data);
      
      if (data.success) {
        toast({
          title: "Dataset Generated",
          description: data.message,
        });
        queryClient.invalidateQueries({ queryKey: ["legal-cases"] });
        queryClient.invalidateQueries({ queryKey: ["case-stats"] });
      } else {
        toast({
          title: "Generation Failed",
          description: data.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error generating synthetic data:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate dataset",
        variant: "destructive",
      });
      setResult({ success: false, error: "Failed to generate dataset" });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="border-primary/20 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Synthetic Dataset Generator</CardTitle>
        </div>
        <CardDescription>
          Generate realistic legal cases resembling the Caselaw Access Project dataset for LexLink AI training
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="case-count">Number of Cases (100-1000)</Label>
            <Input
              id="case-count"
              type="number"
              min={100}
              max={1000}
              value={count}
              onChange={(e) => setCount(Math.min(1000, Math.max(100, parseInt(e.target.value) || 500)))}
              disabled={isGenerating}
            />
          </div>
          <div className="flex items-end">
            <Button 
              onClick={handleGenerate} 
              disabled={isGenerating}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Database className="mr-2 h-4 w-4" />
                  Generate Dataset
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          <Badge variant="outline">U.S. Federal Courts</Badge>
          <Badge variant="outline">CA, NY, TX, FL, IL State Courts</Badge>
          <Badge variant="outline">1990-2024</Badge>
          <Badge variant="outline">10 Legal Domains</Badge>
        </div>

        {result && (
          <div className={`p-4 rounded-lg border ${result.success ? 'bg-green-500/10 border-green-500/30' : 'bg-destructive/10 border-destructive/30'}`}>
            <div className="flex items-center gap-2 mb-2">
              {result.success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-destructive" />
              )}
              <span className="font-medium">
                {result.success ? 'Generation Complete' : 'Generation Failed'}
              </span>
            </div>
            {result.success ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Cases:</span>
                  <span className="ml-1 font-medium">{result.generated}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Citations:</span>
                  <span className="ml-1 font-medium">{result.citations}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Contradictions:</span>
                  <span className="ml-1 font-medium">{result.contradictions}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Similarities:</span>
                  <span className="ml-1 font-medium">{result.similarities}</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-destructive">{result.error}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
