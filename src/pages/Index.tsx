import { LegalHeader } from "@/components/LegalHeader";
import { SearchSection } from "@/components/SearchSection";
import { FeaturedAnalysis } from "@/components/FeaturedAnalysis";
import { SystemMetrics } from "@/components/SystemMetrics";
import { CaseImport } from "@/components/CaseImport";
import { useToast } from "@/hooks/use-toast";
import { useLegalCases, useCaseStats } from "@/hooks/useLegalCases";

// Demo data for presentation
const DEMO_CASES = [
  {
    title: "Brown v. Board of Education",
    court: "Supreme Court of the United States",
    date: "May 17, 1954",
    summary: "Landmark decision declaring state laws establishing separate public schools for black and white students unconstitutional. The Court ruled that 'separate educational facilities are inherently unequal,' effectively overturning Plessy v. Ferguson.",
    tags: ["Constitutional Law", "Civil Rights", "Education"],
    citations: 4823,
    conflicts: 2,
  },
  {
    title: "Miranda v. Arizona",
    court: "Supreme Court of the United States", 
    date: "Jun 13, 1966",
    summary: "Established the requirement that law enforcement must inform suspects of their rights before interrogation. Created the famous 'Miranda warnings' now standard in criminal procedure.",
    tags: ["Criminal Law", "Fifth Amendment", "Due Process"],
    citations: 3156,
    conflicts: 1,
  },
  {
    title: "Roe v. Wade",
    court: "Supreme Court of the United States",
    date: "Jan 22, 1973", 
    summary: "Recognized a woman's constitutional right to privacy extending to her decision to have an abortion. Established the trimester framework for regulating abortion access.",
    tags: ["Constitutional Law", "Privacy Rights", "Healthcare"],
    citations: 2891,
    conflicts: 5,
  },
];

const DEMO_METRICS = {
  totalCases: 15847,
  contradictions: 342,
  graphNodes: 48291,
  similarityScore: 87.3,
};

const Index = () => {
  const { toast } = useToast();
  const { data: cases, isLoading } = useLegalCases(1);
  const { data: stats } = useCaseStats();

  // Use real data if available, otherwise use demo data
  const hasRealData = cases && cases.length > 0;
  
  const featuredCase = hasRealData ? {
    title: cases[0].name,
    court: cases[0].court,
    date: cases[0].decision_date ? new Date(cases[0].decision_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Unknown',
    summary: cases[0].preview?.[0] || cases[0].summary || "No summary available for this case.",
    tags: [cases[0].jurisdiction || "Federal", cases[0].court.split(" ")[0] || "Court", "Legal"],
    citations: 127,
    conflicts: 3,
  } : DEMO_CASES[0];

  const metrics = hasRealData ? {
    totalCases: stats?.totalCases || 1,
    contradictions: stats?.contradictions || 0,
    graphNodes: stats?.graphNodes || 0,
    similarityScore: stats?.similarityScore || 0,
  } : DEMO_METRICS;

  const handleSearch = (query: string) => {
    toast({
      title: "Semantic Search Initiated",
      description: `Analyzing: "${query}" across ${metrics.totalCases.toLocaleString()} cases...`,
    });
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
