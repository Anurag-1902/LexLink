import { LegalHeader } from "@/components/LegalHeader";
import { SearchSection } from "@/components/SearchSection";
import { FeaturedAnalysis } from "@/components/FeaturedAnalysis";
import { SystemMetrics } from "@/components/SystemMetrics";
import { CaseImport } from "@/components/CaseImport";
import { useToast } from "@/hooks/use-toast";
import { useLegalCases, useCaseStats } from "@/hooks/useLegalCases";

const Index = () => {
  const { toast } = useToast();
  const { data: cases, isLoading } = useLegalCases(1);
  const { data: stats } = useCaseStats();

  const featuredCase = cases?.[0] ? {
    title: cases[0].name,
    court: cases[0].court,
    date: cases[0].decision_date ? new Date(cases[0].decision_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Unknown',
    summary: cases[0].preview?.[0] || cases[0].summary || "No summary available for this case.",
    tags: [cases[0].jurisdiction || "Unknown", cases[0].court.split(" ")[0] || "Court", "Legal"],
    citations: 0,
    conflicts: 0,
  } : {
    title: "No cases available",
    court: "Import cases to get started",
    date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
    summary: "Use the import tool to fetch cases from the Caselaw Access Project API.",
    tags: ["Getting Started"],
    citations: 0,
    conflicts: 0,
  };

  const metrics = {
    totalCases: stats?.totalCases || 0,
    contradictions: stats?.contradictions || 0,
    graphNodes: stats?.graphNodes || 0,
    similarityScore: stats?.similarityScore || 0,
  };

  const handleSearch = (query: string) => {
    toast({
      title: "Search initiated",
      description: `Searching for: ${query}`,
    });
    // TODO: Implement semantic search with embeddings
  };

  return (
    <div className="min-h-screen bg-background">
      <LegalHeader />
      <SearchSection onSearch={handleSearch} />
      
      <main className="max-w-7xl mx-auto px-8 py-12">
        <div className="grid lg:grid-cols-3 gap-8 mb-8">
          <div className="lg:col-span-2">
            <FeaturedAnalysis case={featuredCase} />
          </div>
          <div className="space-y-8">
            <SystemMetrics metrics={metrics} />
            <CaseImport />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
