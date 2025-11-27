import { useState } from "react";
import { LegalHeader } from "@/components/LegalHeader";
import { SearchSection } from "@/components/SearchSection";
import { FeaturedAnalysis } from "@/components/FeaturedAnalysis";
import { SystemMetrics } from "@/components/SystemMetrics";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const { toast } = useToast();
  const [searchError, setSearchError] = useState<string | undefined>(
    "Could not fetch cases. Please try again."
  );

  // Mock data - will be replaced with real backend integration
  const featuredCase = {
    title: "Tech Corp. v. Innovation LLC",
    court: "Ninth Circuit Court of Appeals",
    date: "Nov 10, 2024",
    summary:
      "The court held that algorithmic trade secrets are subject to different standards of protection under the DTSA when the algorithm's output is publicly observable...",
    tags: ["Trade Secrets", "Technology", "Appeals"],
    citations: 47,
    conflicts: 3,
  };

  const metrics = {
    totalCases: 24891,
    contradictions: 342,
    graphNodes: 89432,
    similarityScore: 87.3,
  };

  const handleSearch = (query: string) => {
    setSearchError(undefined);
    toast({
      title: "Search initiated",
      description: `Searching knowledge graph for: ${query}`,
    });
    
    // Simulate search delay
    setTimeout(() => {
      setSearchError("Could not fetch cases. Please try again.");
      toast({
        title: "Backend integration pending",
        description: "Connect to Lovable Cloud to enable full search functionality",
        variant: "destructive",
      });
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-background">
      <LegalHeader />
      <SearchSection onSearch={handleSearch} error={searchError} />
      
      <main className="max-w-7xl mx-auto px-8 py-12">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <FeaturedAnalysis case={featuredCase} />
          </div>
          <div>
            <SystemMetrics metrics={metrics} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
