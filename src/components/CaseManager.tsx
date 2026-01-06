import { useState } from "react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { useAddCase, useDeleteCase, useLegalCases, useSummarizeCase } from "@/hooks/useLegalCases";
import { useDetectRelationships, useAutoCreateRelationships } from "@/hooks/useDetectRelationships";
import { Plus, Trash2, Loader2, Database, Scale, Sparkles, Brain } from "lucide-react";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import { toast } from "sonner";

const COURTS = [
  "Supreme Court of the United States",
  "U.S. Court of Appeals",
  "U.S. District Court",
  "California Supreme Court",
  "New York Court of Appeals",
  "Texas Supreme Court",
  "Florida Supreme Court",
];

const JURISDICTIONS = [
  "Federal",
  "California",
  "New York",
  "Texas",
  "Florida",
  "Illinois",
  "Pennsylvania",
];

export const CaseManager = () => {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState("");
  const [newCase, setNewCase] = useState({
    name: "",
    court: COURTS[0],
    jurisdiction: JURISDICTIONS[0],
    decision_date: new Date().toISOString().split("T")[0],
    summary: "",
    docket_number: "",
  });

  const { data: cases, isLoading } = useLegalCases(50);
  const addCase = useAddCase();
  const deleteCase = useDeleteCase();
  const summarizeCase = useSummarizeCase();
  const detectRelationships = useDetectRelationships();
  const autoCreateRelationships = useAutoCreateRelationships();

  const handleAddCase = async () => {
    if (!newCase.name.trim()) return;
    
    setIsProcessing(true);
    setProcessingStatus("Adding case...");
    
    try {
      const addedCase = await addCase.mutateAsync({
        name: newCase.name,
        court: newCase.court,
        jurisdiction: newCase.jurisdiction,
        decision_date: newCase.decision_date,
        summary: newCase.summary,
        docket_number: newCase.docket_number,
        case_id: `MANUAL-${Date.now()}`,
      });
      
      let finalSummary = newCase.summary;
      
      // Generate AI summary if no manual summary
      if (!newCase.summary && addedCase?.id) {
        setProcessingStatus("Generating AI summary...");
        try {
          const result = await summarizeCase.mutateAsync({
            caseId: addedCase.id,
            caseName: newCase.name,
            court: newCase.court,
            jurisdiction: newCase.jurisdiction,
          });
          finalSummary = result?.summary;
          toast.success("AI summary generated!");
        } catch (err) {
          console.error("Summary generation failed:", err);
        }
      }
      
      // Detect and create AI relationships
      if (addedCase?.id) {
        setProcessingStatus("Detecting relationships...");
        try {
          const detection = await detectRelationships.mutateAsync({
            newCaseId: addedCase.id,
            newCaseName: newCase.name,
            newCaseSummary: finalSummary,
            newCaseCourt: newCase.court,
            newCaseJurisdiction: newCase.jurisdiction,
          });
          
          if (detection.relationships) {
            const { citations, similarities, contradictions } = detection.relationships;
            const total = (citations?.length || 0) + (similarities?.length || 0) + (contradictions?.length || 0);
            
            if (total > 0) {
              await autoCreateRelationships.mutateAsync({
                newCaseId: addedCase.id,
                relationships: detection.relationships,
              });
            }
          }
        } catch (err) {
          console.error("Relationship detection failed:", err);
        }
      }
      
      setIsAddOpen(false);
      setNewCase({
        name: "",
        court: COURTS[0],
        jurisdiction: JURISDICTIONS[0],
        decision_date: new Date().toISOString().split("T")[0],
        summary: "",
        docket_number: "",
      });
      toast.success("Case added with AI analysis!");
    } catch (err) {
      toast.error("Failed to add case");
    } finally {
      setIsProcessing(false);
      setProcessingStatus("");
    }
  };

  const handleDeleteCase = (id: string, name: string) => {
    if (confirm(`Delete "${name}"? This cannot be undone.`)) {
      deleteCase.mutate(id);
    }
  };

  return (
    <Card className="p-6 border-l-4 border-l-primary">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Database className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Case Manager</h3>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Add Case
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Scale className="w-5 h-5" />
                Add New Legal Case
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label htmlFor="case-name">Case Name *</Label>
                <Input
                  id="case-name"
                  value={newCase.name}
                  onChange={(e) => setNewCase({ ...newCase, name: e.target.value })}
                  placeholder="Smith v. Johnson"
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Court</Label>
                  <Select
                    value={newCase.court}
                    onValueChange={(v) => setNewCase({ ...newCase, court: v })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COURTS.map((court) => (
                        <SelectItem key={court} value={court}>
                          {court}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Jurisdiction</Label>
                  <Select
                    value={newCase.jurisdiction}
                    onValueChange={(v) => setNewCase({ ...newCase, jurisdiction: v })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {JURISDICTIONS.map((j) => (
                        <SelectItem key={j} value={j}>
                          {j}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="decision-date">Decision Date</Label>
                  <Input
                    id="decision-date"
                    type="date"
                    value={newCase.decision_date}
                    onChange={(e) => setNewCase({ ...newCase, decision_date: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="docket">Docket Number</Label>
                  <Input
                    id="docket"
                    value={newCase.docket_number}
                    onChange={(e) => setNewCase({ ...newCase, docket_number: e.target.value })}
                    placeholder="22-1234"
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="summary">Summary</Label>
                <Textarea
                  id="summary"
                  value={newCase.summary}
                  onChange={(e) => setNewCase({ ...newCase, summary: e.target.value })}
                  placeholder="Leave empty for AI-generated summary..."
                  rows={3}
                  className="mt-1"
                />
                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                  <Sparkles className="h-3 w-3" />
                  <span>AI will auto-generate summary and detect relationships</span>
                </div>
              </div>

              <Button
                onClick={handleAddCase}
                disabled={!newCase.name.trim() || isProcessing}
                className="w-full"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {processingStatus}
                  </>
                ) : (
                  <>
                    <Brain className="w-4 h-4 mr-2" />
                    Add with AI Analysis
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <p className="text-xs text-muted-foreground mb-4">
        Manage cases in the dataset. Add or remove cases to update the knowledge graph.
      </p>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : cases && cases.length > 0 ? (
        <ScrollArea className="h-48">
          <div className="space-y-2 pr-4">
            {cases.slice(0, 20).map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between p-2 rounded-md bg-muted/50 hover:bg-muted transition-colors group"
              >
                <div className="flex-1 min-w-0 mr-2">
                  <p className="text-sm font-medium truncate">{c.name}</p>
                  <div className="flex gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {c.jurisdiction || "Federal"}
                    </Badge>
                    {c.decision_date && (
                      <Badge variant="secondary" className="text-xs">
                        {new Date(c.decision_date).getFullYear()}
                      </Badge>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => handleDeleteCase(c.id, c.name)}
                  disabled={deleteCase.isPending}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            {cases.length > 20 && (
              <p className="text-xs text-muted-foreground text-center py-2">
                +{cases.length - 20} more cases in database
              </p>
            )}
          </div>
        </ScrollArea>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <Database className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No cases in database</p>
          <p className="text-xs">Add cases or generate synthetic data</p>
        </div>
      )}
    </Card>
  );
};
