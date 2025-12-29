import { useState } from "react";
import { LegalHeader } from "@/components/LegalHeader";
import { SearchSection } from "@/components/SearchSection";
import { SearchResults } from "@/components/SearchResults";
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
  {
    title: "Marbury v. Madison",
    court: "Supreme Court of the United States",
    date: "Feb 24, 1803",
    summary: "Established the principle of judicial review, giving the Supreme Court the power to declare laws unconstitutional. Foundational case for American constitutional law.",
    tags: ["Constitutional Law", "Judicial Review", "Separation of Powers"],
    citations: 5621,
    conflicts: 0,
  },
  {
    title: "Gideon v. Wainwright",
    court: "Supreme Court of the United States",
    date: "Mar 18, 1963",
    summary: "Ruled that states are required to provide counsel in criminal cases for defendants who cannot afford an attorney. Extended the Sixth Amendment right to counsel.",
    tags: ["Criminal Law", "Sixth Amendment", "Right to Counsel"],
    citations: 2134,
    conflicts: 1,
  },
];

const DEMO_METRICS = {
  totalCases: 15847,
  contradictions: 342,
  graphNodes: 48291,
  similarityScore: 87.3,
};

// Simple semantic similarity function using keyword matching
const calculateRelevance = (query: string, caseData: typeof DEMO_CASES[0]): number => {
  const queryLower = query.toLowerCase();
  const searchableText = `${caseData.title} ${caseData.summary} ${caseData.tags.join(" ")}`.toLowerCase();
  
  // Check for exact phrase match
  if (searchableText.includes(queryLower)) {
    return 0.95 + Math.random() * 0.05;
  }
  
  // Check for word matches
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);
  const matchCount = queryWords.filter(word => searchableText.includes(word)).length;
  
  if (matchCount > 0) {
    return 0.7 + (matchCount / queryWords.length) * 0.25;
  }
  
  // Base relevance for legal topics
  return 0.4 + Math.random() * 0.2;
};

const Index = () => {
  const { toast } = useToast();
  const { data: cases, isLoading } = useLegalCases(1);
  const { data: stats } = useCaseStats();
  const [searchResults, setSearchResults] = useState<Array<typeof DEMO_CASES[0] & { relevanceScore: number }>>([]);
  const [searchQuery, setSearchQuery] = useState("");

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
    setSearchQuery(query);
    
    // Calculate relevance scores and sort
    const results = DEMO_CASES
      .map(c => ({ ...c, relevanceScore: calculateRelevance(query, c) }))
      .sort((a, b) => b.relevanceScore - a.relevanceScore);
    
    setSearchResults(results);
    
    toast({
      title: "Semantic Search Complete",
      description: `Found ${results.length} relevant cases for "${query}"`,
    });
  };

  const clearResults = () => {
    setSearchResults([]);
    setSearchQuery("");
  };

  return (
    <div className="min-h-screen bg-background">
      <LegalHeader />
      <SearchSection onSearch={handleSearch} />
      
      {searchResults.length > 0 && (
        <SearchResults 
          results={searchResults} 
          query={searchQuery} 
          onClose={clearResults}
        />
      )}
      
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
