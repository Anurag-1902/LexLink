import { useState } from "react";
import { LegalHeader } from "@/components/LegalHeader";
import { SearchSection } from "@/components/SearchSection";
import { SearchResults } from "@/components/SearchResults";
import { FeaturedAnalysis } from "@/components/FeaturedAnalysis";
import { SystemMetrics } from "@/components/SystemMetrics";
import { KnowledgeGraph } from "@/components/KnowledgeGraph";
import { CaseManager } from "@/components/CaseManager";
import { SyntheticDataGenerator } from "@/components/SyntheticDataGenerator";
import { useToast } from "@/hooks/use-toast";
import { useLegalCases, useCaseStats } from "@/hooks/useLegalCases";
import { useCaseSearch } from "@/hooks/useCaseSearch";

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
  {
    title: "Mapp v. Ohio",
    court: "Supreme Court of the United States",
    date: "Jun 19, 1961",
    summary: "Extended the exclusionary rule to state courts, ruling that evidence obtained in violation of the Fourth Amendment cannot be used in state criminal prosecutions.",
    tags: ["Criminal Law", "Fourth Amendment", "Search and Seizure"],
    citations: 1876,
    conflicts: 2,
  },
  {
    title: "Plessy v. Ferguson",
    court: "Supreme Court of the United States",
    date: "May 18, 1896",
    summary: "Upheld the constitutionality of racial segregation under the 'separate but equal' doctrine. Later overruled by Brown v. Board of Education.",
    tags: ["Constitutional Law", "Civil Rights", "Equal Protection"],
    citations: 892,
    conflicts: 8,
  },
  {
    title: "New York Times v. Sullivan",
    court: "Supreme Court of the United States",
    date: "Mar 9, 1964",
    summary: "Established the 'actual malice' standard for defamation suits brought by public officials, significantly expanding First Amendment protections for the press.",
    tags: ["First Amendment", "Defamation", "Press Freedom"],
    citations: 2543,
    conflicts: 1,
  },
  {
    title: "Loving v. Virginia",
    court: "Supreme Court of the United States",
    date: "Jun 12, 1967",
    summary: "Struck down laws banning interracial marriage, ruling that such statutes violated both the Equal Protection and Due Process Clauses of the Fourteenth Amendment.",
    tags: ["Constitutional Law", "Civil Rights", "Marriage"],
    citations: 1654,
    conflicts: 0,
  },
  {
    title: "Obergefell v. Hodges",
    court: "Supreme Court of the United States",
    date: "Jun 26, 2015",
    summary: "Ruled that the fundamental right to marry is guaranteed to same-sex couples under both the Due Process Clause and the Equal Protection Clause.",
    tags: ["Constitutional Law", "Civil Rights", "Marriage Equality"],
    citations: 987,
    conflicts: 2,
  },
];

const DEMO_METRICS = {
  totalCases: 15847,
  contradictions: 342,
  graphNodes: 48291,
  similarityScore: 87.3,
};

// Deterministic relevance scoring (no random shuffling)
type SearchCardResult = {
  id?: string;
  title: string;
  court: string;
  date: string;
  summary: string;
  tags: string[];
  citations: number;
  conflicts: number;
  relevanceScore: number;
};

const tokenizeQuery = (query: string) =>
  query
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 1);

const scoreCase = (query: string, caseData: { title: string; summary: string; tags: string[] }) => {
  const q = query.toLowerCase().trim();
  if (!q) return 0;

  const terms = tokenizeQuery(q);
  const searchableText = `${caseData.title} ${caseData.summary} ${caseData.tags.join(" ")}`.toLowerCase();

  // Exact phrase match gets a perfect score
  if (q.length > 2 && searchableText.includes(q)) return 1;

  if (terms.length === 0) return 0;
  const matchCount = terms.reduce((acc, term) => acc + (searchableText.includes(term) ? 1 : 0), 0);
  return matchCount / terms.length;
};

const Index = () => {
  const { toast } = useToast();
  const { data: cases, isLoading } = useLegalCases(1);
  const { data: stats } = useCaseStats();
  const caseSearch = useCaseSearch();

  const [searchResults, setSearchResults] = useState<SearchCardResult[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Use real data if available, otherwise use demo data
  const hasRealData = cases && cases.length > 0;

  const featuredCase = hasRealData
    ? {
        title: cases[0].name,
        court: cases[0].court,
        date: cases[0].decision_date
          ? new Date(cases[0].decision_date).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })
          : "Unknown",
        summary: cases[0].preview?.[0] || cases[0].summary || "No summary available for this case.",
        tags: [cases[0].jurisdiction || "Federal", cases[0].court.split(" ")[0] || "Court", "Legal"],
        citations: 127,
        conflicts: 3,
      }
    : DEMO_CASES[0];

  const metrics = hasRealData
    ? {
        totalCases: stats?.totalCases || 1,
        contradictions: stats?.contradictions || 0,
        graphNodes: stats?.graphNodes || 0,
        similarityScore: 87.0,
      }
    : DEMO_METRICS;

  const handleSearch = async (query: string) => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      toast({
        title: "Enter a search",
        description: "Type at least 2 characters to search cases.",
        variant: "destructive",
      });
      return;
    }

    setSearchQuery(trimmed);

    // Prefer real database search; fallback to demo data only if there's no dataset yet.
    if (hasRealData) {
      try {
        const rows = await caseSearch.mutateAsync(trimmed);

        const results = rows
          .map((row) => {
            const dateSort = row.decision_date ? new Date(row.decision_date).getTime() : 0;
            const mapped = {
              id: row.id,
              title: row.name,
              court: row.court,
              date: row.decision_date
                ? new Date(row.decision_date).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })
                : "Unknown",
              summary: row.summary ?? "",
              tags: [row.jurisdiction || "Unknown", row.court.split(" ")[0] || "Court"],
              citations: 0,
              conflicts: 0,
              relevanceScore: 0,
              dateSort,
            };

            mapped.relevanceScore = scoreCase(trimmed, {
              title: mapped.title,
              summary: mapped.summary,
              tags: mapped.tags,
            });

            return mapped;
          })
          .filter((r) => r.relevanceScore > 0)
          .sort((a, b) => {
            if (b.relevanceScore !== a.relevanceScore) return b.relevanceScore - a.relevanceScore;
            return b.dateSort - a.dateSort;
          })
          .slice(0, 25)
          .map(({ dateSort, ...rest }) => rest);

        setSearchResults(results);

        toast({
          title: "Search complete",
          description:
            results.length > 0
              ? `Found ${results.length} cases matching "${trimmed}"`
              : `No matching cases found for "${trimmed}"`,
        });
      } catch (error: any) {
        toast({
          title: "Search failed",
          description: error?.message || "Could not run search.",
          variant: "destructive",
        });
      }

      return;
    }

    // Demo fallback (deterministic)
    const demoResults = DEMO_CASES
      .map((c) => ({
        ...c,
        relevanceScore: scoreCase(trimmed, { title: c.title, summary: c.summary, tags: c.tags }),
      }))
      .filter((r) => r.relevanceScore > 0)
      .sort((a, b) => b.relevanceScore - a.relevanceScore);

    setSearchResults(demoResults);

    toast({
      title: "Search complete",
      description: `Found ${demoResults.length} matching cases for "${trimmed}"`,
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
        {/* Featured Analysis and Metrics Row */}
        <div className="grid lg:grid-cols-3 gap-8 mb-8">
          <div className="lg:col-span-2">
            <FeaturedAnalysis case={featuredCase} />
          </div>
          <div>
            <SystemMetrics metrics={metrics} />
          </div>
        </div>
        
        {/* Knowledge Graph beside Case Manager and Dataset Generator */}
        <div className="grid lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <CaseManager />
            <SyntheticDataGenerator />
          </div>
          <div>
            <KnowledgeGraph />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
