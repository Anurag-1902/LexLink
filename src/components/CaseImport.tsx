import { useState } from "react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useImportCases } from "@/hooks/useLegalCases";
import { Download, Loader2 } from "lucide-react";

export const CaseImport = () => {
  const [jurisdiction, setJurisdiction] = useState("us");
  const [limit, setLimit] = useState(100);
  const importCases = useImportCases();

  const handleImport = () => {
    importCases.mutate({ jurisdiction, limit, offset: 0 });
  };

  return (
    <Card className="p-6 border-l-4 border-l-accent">
      <div className="flex items-center gap-3 mb-4">
        <Download className="w-5 h-5 text-accent" />
        <h3 className="text-lg font-semibold text-primary">Import Legal Cases</h3>
      </div>
      
      <div className="space-y-4">
        <div>
          <Label htmlFor="jurisdiction">Jurisdiction</Label>
          <Input
            id="jurisdiction"
            value={jurisdiction}
            onChange={(e) => setJurisdiction(e.target.value)}
            placeholder="us, cal, ny, etc."
            className="mt-1"
          />
        </div>
        
        <div>
          <Label htmlFor="limit">Number of Cases</Label>
          <Input
            id="limit"
            type="number"
            value={limit}
            onChange={(e) => setLimit(parseInt(e.target.value))}
            min="1"
            max="10000"
            className="mt-1"
          />
        </div>

        <Button 
          onClick={handleImport} 
          disabled={importCases.isPending}
          className="w-full"
        >
          {importCases.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Importing...
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              Import Cases
            </>
          )}
        </Button>
        
        {importCases.isSuccess && (
          <p className="text-sm text-muted-foreground">
            Successfully imported {importCases.data?.processed || 0} cases
          </p>
        )}
      </div>
    </Card>
  );
};