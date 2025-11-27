import { Scale } from "lucide-react";

export const LegalHeader = () => {
  const today = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <header className="bg-background border-b border-border py-6 px-8">
      <div className="max-w-7xl mx-auto flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Scale className="w-8 h-8" />
            <h1 className="text-4xl font-serif font-bold tracking-tight">LexLink</h1>
          </div>
          <p className="text-sm text-muted-foreground tracking-widest uppercase">
            Intelligent Legal Research · Knowledge Graphs · AI Analysis
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground tracking-wider uppercase mb-1">Today</p>
          <p className="text-sm font-semibold">{today}</p>
        </div>
      </div>
    </header>
  );
};
