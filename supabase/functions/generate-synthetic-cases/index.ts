import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Legal domains and their typical case types
const legalDomains = [
  { domain: "Constitutional Law", topics: ["First Amendment", "Due Process", "Equal Protection", "Fourth Amendment", "Commerce Clause"] },
  { domain: "Criminal Law", topics: ["Murder", "Robbery", "Drug Possession", "Fraud", "Assault", "White Collar Crime"] },
  { domain: "Civil Rights", topics: ["Discrimination", "Voting Rights", "Police Misconduct", "Employment Discrimination", "Housing Discrimination"] },
  { domain: "Contract Law", topics: ["Breach of Contract", "Fraud", "Specific Performance", "Unjust Enrichment", "Promissory Estoppel"] },
  { domain: "Tort Law", topics: ["Negligence", "Products Liability", "Medical Malpractice", "Defamation", "Intentional Infliction"] },
  { domain: "Intellectual Property", topics: ["Patent Infringement", "Copyright Violation", "Trademark Dilution", "Trade Secret", "Fair Use"] },
  { domain: "Environmental Law", topics: ["Clean Water Act", "Clean Air Act", "NEPA", "Endangered Species", "Toxic Torts"] },
  { domain: "Administrative Law", topics: ["Agency Rulemaking", "Due Process", "Judicial Review", "Chevron Deference", "Standing"] },
  { domain: "Labor Law", topics: ["Collective Bargaining", "FLSA Violations", "Wrongful Termination", "NLRA", "Wage Disputes"] },
  { domain: "Family Law", topics: ["Child Custody", "Divorce", "Adoption", "Child Support", "Domestic Violence"] },
];

const federalCourts = [
  { name: "Supreme Court of the United States", abbrev: "U.S.", level: "supreme" },
  { name: "United States Court of Appeals for the First Circuit", abbrev: "1st Cir.", level: "appellate" },
  { name: "United States Court of Appeals for the Second Circuit", abbrev: "2d Cir.", level: "appellate" },
  { name: "United States Court of Appeals for the Third Circuit", abbrev: "3d Cir.", level: "appellate" },
  { name: "United States Court of Appeals for the Fourth Circuit", abbrev: "4th Cir.", level: "appellate" },
  { name: "United States Court of Appeals for the Fifth Circuit", abbrev: "5th Cir.", level: "appellate" },
  { name: "United States Court of Appeals for the Sixth Circuit", abbrev: "6th Cir.", level: "appellate" },
  { name: "United States Court of Appeals for the Seventh Circuit", abbrev: "7th Cir.", level: "appellate" },
  { name: "United States Court of Appeals for the Eighth Circuit", abbrev: "8th Cir.", level: "appellate" },
  { name: "United States Court of Appeals for the Ninth Circuit", abbrev: "9th Cir.", level: "appellate" },
  { name: "United States Court of Appeals for the Tenth Circuit", abbrev: "10th Cir.", level: "appellate" },
  { name: "United States Court of Appeals for the Eleventh Circuit", abbrev: "11th Cir.", level: "appellate" },
  { name: "United States Court of Appeals for the D.C. Circuit", abbrev: "D.C. Cir.", level: "appellate" },
  { name: "United States District Court for the Southern District of New York", abbrev: "S.D.N.Y.", level: "district" },
  { name: "United States District Court for the Central District of California", abbrev: "C.D. Cal.", level: "district" },
  { name: "United States District Court for the Northern District of Texas", abbrev: "N.D. Tex.", level: "district" },
];

const stateCourts = [
  { name: "Supreme Court of California", abbrev: "Cal.", jurisdiction: "California", level: "supreme" },
  { name: "California Court of Appeal", abbrev: "Cal. App.", jurisdiction: "California", level: "appellate" },
  { name: "New York Court of Appeals", abbrev: "N.Y.", jurisdiction: "New York", level: "supreme" },
  { name: "New York Supreme Court, Appellate Division", abbrev: "N.Y. App. Div.", jurisdiction: "New York", level: "appellate" },
  { name: "Supreme Court of Texas", abbrev: "Tex.", jurisdiction: "Texas", level: "supreme" },
  { name: "Texas Court of Appeals", abbrev: "Tex. App.", jurisdiction: "Texas", level: "appellate" },
  { name: "Supreme Court of Florida", abbrev: "Fla.", jurisdiction: "Florida", level: "supreme" },
  { name: "Florida District Court of Appeal", abbrev: "Fla. Dist. Ct. App.", jurisdiction: "Florida", level: "appellate" },
  { name: "Supreme Court of Illinois", abbrev: "Ill.", jurisdiction: "Illinois", level: "supreme" },
  { name: "Illinois Appellate Court", abbrev: "Ill. App.", jurisdiction: "Illinois", level: "appellate" },
];

const firstNames = ["James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda", "William", "Elizabeth", "David", "Barbara", "Richard", "Susan", "Joseph", "Jessica", "Thomas", "Sarah", "Charles", "Karen", "Christopher", "Lisa", "Daniel", "Nancy", "Matthew", "Betty", "Anthony", "Margaret", "Mark", "Sandra"];
const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson"];
const corporations = ["Acme Corp", "TechGlobal Inc", "Pacific Industries", "Metro Holdings", "Atlantic Manufacturing", "National Services Corp", "Continental Enterprises", "United Systems Inc", "Premier Solutions", "Apex Technologies", "Summit Healthcare", "Coastal Development", "Midwest Financial", "Southern Energy", "Western Transport"];
const agencies = ["Environmental Protection Agency", "Federal Trade Commission", "Securities and Exchange Commission", "Department of Labor", "Department of Health and Human Services", "Internal Revenue Service", "Federal Communications Commission", "National Labor Relations Board"];

const legalPhrases = {
  holdings: [
    "The Court holds that the defendant's constitutional rights were violated when",
    "We conclude that the lower court erred in its interpretation of",
    "The evidence presented at trial was insufficient to establish",
    "The statute at issue clearly contemplates that",
    "Based on the precedent established in prior cases, we find that",
    "The constitutional guarantee of due process requires that",
    "We reverse the decision below and remand for proceedings consistent with",
    "The plaintiff has failed to demonstrate the requisite elements of",
    "Under the applicable standard of review, we affirm the district court's ruling that",
    "The regulatory framework established by Congress mandates that",
  ],
  reasoning: [
    "The fundamental principle underlying this decision is that",
    "Courts have consistently recognized that",
    "The legislative history demonstrates that Congress intended",
    "The plain language of the statute compels the conclusion that",
    "Applying the balancing test established in prior precedent",
    "The constitutional framework requires courts to consider",
    "The practical implications of the opposing interpretation would",
    "Consistent with the purposes of the Act, we interpret",
    "The established precedent in this circuit holds that",
    "Drawing upon the rationale of similar cases, we conclude",
  ],
  dissent: [
    "I respectfully dissent from the majority's interpretation of",
    "The majority opinion fundamentally misunderstands",
    "I cannot join the Court's reasoning because",
    "The consequences of today's decision will",
    "The majority's reliance on precedent is misplaced because",
    "I write separately to express my concern that",
  ],
};

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateRandomDate(startYear: number, endYear: number): string {
  const year = randomInt(startYear, endYear);
  const month = randomInt(1, 12);
  const day = randomInt(1, 28);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function generatePartyName(type: "person" | "corporation" | "agency" | "state"): string {
  switch (type) {
    case "person":
      return `${randomElement(firstNames)} ${randomElement(lastNames)}`;
    case "corporation":
      return randomElement(corporations);
    case "agency":
      return randomElement(agencies);
    case "state":
      return `State of ${randomElement(["California", "New York", "Texas", "Florida", "Illinois"])}`;
  }
}

function generateCaseName(): { full: string; abbreviated: string } {
  const partyTypes: ("person" | "corporation" | "agency" | "state")[] = ["person", "corporation", "agency", "state"];
  const plaintiff = generatePartyName(randomElement(partyTypes));
  const defendant = generatePartyName(randomElement(partyTypes));
  
  const plaintiffAbbrev = plaintiff.split(" ")[plaintiff.includes("Corp") || plaintiff.includes("Inc") ? 0 : plaintiff.split(" ").length - 1];
  const defendantAbbrev = defendant.split(" ")[defendant.includes("Corp") || defendant.includes("Inc") ? 0 : defendant.split(" ").length - 1];
  
  return {
    full: `${plaintiff} v. ${defendant}`,
    abbreviated: `${plaintiffAbbrev} v. ${defendantAbbrev}`,
  };
}

function generateDocketNumber(court: { level: string; abbrev: string }, year: number): string {
  const num = randomInt(1000, 9999);
  if (court.level === "supreme") {
    return `${year % 100}-${num}`;
  } else if (court.level === "appellate") {
    return `${year % 100}-${num}`;
  } else {
    return `${randomInt(1, 9)}:${year % 100}-cv-${String(num).padStart(5, '0')}`;
  }
}

function generateCitation(court: { abbrev: string }, year: number, volume: number, page: number): string {
  return `${volume} ${court.abbrev} ${page} (${year})`;
}

function generateSummary(domain: string, topic: string, holding: string): string {
  const templates = [
    `This ${domain} case addresses the issue of ${topic}. ${holding} The court's analysis focused on statutory interpretation and established precedent.`,
    `In this significant ${domain} decision, the court examined questions of ${topic}. ${holding} The ruling has implications for similar cases in this jurisdiction.`,
    `The case presents important questions regarding ${topic} within the broader context of ${domain}. ${holding} The opinion provides guidance on the applicable legal standards.`,
    `This appeal concerns ${topic}, a frequently litigated area of ${domain}. ${holding} The court carefully analyzed the relevant statutory framework and case law.`,
  ];
  return randomElement(templates);
}

function generateHeadnotes(domain: string, topic: string): string {
  const headnotes = [
    `[1] ${domain}—${topic}—Standards of Review. When reviewing a claim of ${topic.toLowerCase()}, appellate courts apply de novo review to questions of law and clear error review to findings of fact.`,
    `[2] ${domain}—${topic}—Elements. To establish a prima facie case of ${topic.toLowerCase()}, a plaintiff must demonstrate: (1) a legally protected interest; (2) defendant's conduct; (3) causation; and (4) damages.`,
    `[3] ${domain}—${topic}—Defenses. The defendant may raise affirmative defenses including statute of limitations, qualified immunity, and consent.`,
    `[4] ${domain}—Remedies. Available remedies include injunctive relief, compensatory damages, and in appropriate cases, punitive damages.`,
  ];
  return headnotes.join("\n\n");
}

function generateFullText(caseName: string, court: { name: string }, date: string, domain: string, topic: string): string {
  const judge = `${randomElement(["Chief Justice", "Justice", "Judge", "Circuit Judge"])} ${randomElement(lastNames)}`;
  const holding = randomElement(legalPhrases.holdings);
  const reasoning = randomElement(legalPhrases.reasoning);
  
  let opinion = `${court.name}\n\n${caseName}\n\nDecided ${date}\n\n`;
  opinion += `${judge}, delivering the opinion of the Court:\n\n`;
  opinion += `This case comes before us on appeal from the lower court's decision regarding ${topic} under ${domain}.\n\n`;
  opinion += `I. BACKGROUND\n\n`;
  opinion += `The facts giving rise to this litigation are as follows. ${holding} the established standards under federal and state law.\n\n`;
  opinion += `II. STANDARD OF REVIEW\n\n`;
  opinion += `We review the district court's legal conclusions de novo and its factual findings for clear error. Questions of constitutional interpretation are reviewed de novo.\n\n`;
  opinion += `III. ANALYSIS\n\n`;
  opinion += `${reasoning} the applicable legal framework requires careful consideration of competing interests.\n\n`;
  opinion += `The Supreme Court has established that courts must balance the governmental interest against the individual's protected rights. See prior precedent establishing this analytical framework.\n\n`;
  opinion += `Applying these principles to the case at bar, we conclude that ${holding.toLowerCase()} the requirements of due process and equal protection.\n\n`;
  opinion += `IV. CONCLUSION\n\n`;
  opinion += `For the foregoing reasons, the judgment of the lower court is ${randomElement(["AFFIRMED", "REVERSED", "REVERSED and REMANDED", "AFFIRMED in part and REVERSED in part"])}.\n\n`;
  opinion += `It is so ordered.`;
  
  // Add dissent 30% of the time
  if (Math.random() < 0.3) {
    const dissentJudge = `Justice ${randomElement(lastNames)}`;
    opinion += `\n\n---\n\n${dissentJudge}, dissenting:\n\n`;
    opinion += `${randomElement(legalPhrases.dissent)} the majority's reasoning in this case. `;
    opinion += `I would hold that the proper interpretation of the relevant statute leads to a different result.\n\n`;
    opinion += `For these reasons, I respectfully dissent.`;
  }
  
  return opinion;
}

function generateCase(index: number, existingCases: any[]): any {
  const isFederal = Math.random() < 0.6;
  const court = isFederal ? randomElement(federalCourts) : randomElement(stateCourts);
  const domainInfo = randomElement(legalDomains);
  const topic = randomElement(domainInfo.topics);
  
  const year = randomInt(1990, 2024);
  const date = generateRandomDate(year, year);
  const caseName = generateCaseName();
  const holding = randomElement(legalPhrases.holdings);
  
  const volume = randomInt(100, 999);
  const page = randomInt(1, 1500);
  const citation = generateCitation(court, year, volume, page);
  
  // Generate citations to existing cases (for knowledge graph)
  const citations: any[] = [];
  const numCitations = Math.min(existingCases.length, randomInt(0, 5));
  const shuffled = [...existingCases].sort(() => Math.random() - 0.5);
  for (let i = 0; i < numCitations; i++) {
    const citedCase = shuffled[i];
    citations.push({
      case_id: citedCase.case_id,
      citation: citedCase.citations?.[0]?.cite || `${randomInt(100, 999)} U.S. ${randomInt(1, 999)}`,
      type: randomElement(["supporting", "distinguishing", "overruling", "citing"]),
    });
  }
  
  return {
    case_id: `synth-${year}-${String(index).padStart(6, '0')}`,
    name: caseName.full,
    name_abbreviation: caseName.abbreviated,
    court: court.name,
    decision_date: date,
    jurisdiction: isFederal ? "Federal" : (court as any).jurisdiction || "State",
    docket_number: generateDocketNumber(court, year),
    citations: [{ cite: citation, type: "official" }, ...citations],
    url: `https://case.law/synth/${year}/${index}`,
    frontend_url: `https://case.law/synth/${year}/${index}`,
    preview: [caseName.full, `${court.name} | ${date}`, `${domainInfo.domain} - ${topic}`],
    summary: generateSummary(domainInfo.domain, topic, holding),
    headnotes: generateHeadnotes(domainInfo.domain, topic),
    full_text: generateFullText(caseName.full, court, date, domainInfo.domain, topic),
    case_opinions: [{
      type: "majority",
      author: `${randomElement(["Chief Justice", "Justice", "Judge"])} ${randomElement(lastNames)}`,
    }],
    metadata: {
      domain: domainInfo.domain,
      topic: topic,
      court_level: court.level,
      is_federal: isFederal,
      year: year,
      synthetic: true,
    },
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { count = 500 } = await req.json();
    const targetCount = Math.min(Math.max(count, 100), 1000);
    
    console.log(`Generating ${targetCount} synthetic legal cases...`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Generate cases in batches
    const batchSize = 50;
    const allCases: any[] = [];
    let inserted = 0;
    let errors = 0;

    for (let i = 0; i < targetCount; i += batchSize) {
      const batchEnd = Math.min(i + batchSize, targetCount);
      const batch: any[] = [];
      
      for (let j = i; j < batchEnd; j++) {
        batch.push(generateCase(j, allCases));
      }
      
      // Insert batch
      const { data, error } = await supabase
        .from("legal_cases")
        .upsert(batch, { onConflict: "case_id" })
        .select();

      if (error) {
        console.error(`Batch ${i}-${batchEnd} error:`, error);
        errors += batch.length;
      } else {
        inserted += batch.length;
        allCases.push(...batch);
        console.log(`Inserted batch ${i}-${batchEnd} (${inserted}/${targetCount})`);
      }
    }

    // Generate case citations relationships
    console.log("Generating citation relationships...");
    const citationRecords: any[] = [];
    
    for (const legalCase of allCases) {
      const caseCitations = legalCase.citations?.filter((c: any) => c.case_id) || [];
      for (const citation of caseCitations) {
        const citedCase = allCases.find(c => c.case_id === citation.case_id);
        if (citedCase) {
          citationRecords.push({
            citing_case_id: legalCase.id,
            cited_case_id: citedCase.id,
            citation_text: citation.citation,
          });
        }
      }
    }

    // Generate some contradictions (cases that overrule each other)
    console.log("Generating contradiction relationships...");
    const contradictionRecords: any[] = [];
    const overrulingCases = allCases.filter(c => 
      c.citations?.some((cit: any) => cit.type === "overruling")
    );
    
    for (const legalCase of overrulingCases.slice(0, 50)) {
      const overruledCitation = legalCase.citations?.find((c: any) => c.type === "overruling");
      if (overruledCitation?.case_id) {
        contradictionRecords.push({
          case_a_id: legalCase.case_id,
          case_b_id: overruledCitation.case_id,
          conflict_type: randomElement(["temporal", "jurisdictional", "doctrinal"]),
          confidence_score: Math.random() * 0.3 + 0.7,
          description: `${legalCase.name_abbreviation} overrules prior holding in ${overruledCitation.case_id}`,
        });
      }
    }

    // Generate similarity relationships
    console.log("Generating similarity relationships...");
    const similarityRecords: any[] = [];
    
    // Group cases by domain and create similarity relationships
    const domainGroups: Record<string, any[]> = {};
    for (const legalCase of allCases) {
      const domain = legalCase.metadata?.domain || "Unknown";
      if (!domainGroups[domain]) domainGroups[domain] = [];
      domainGroups[domain].push(legalCase);
    }
    
    for (const [domain, cases] of Object.entries(domainGroups)) {
      // Create similarities within same domain
      for (let i = 0; i < Math.min(cases.length, 20); i++) {
        for (let j = i + 1; j < Math.min(i + 5, cases.length); j++) {
          similarityRecords.push({
            case_a_id: cases[i].case_id,
            case_b_id: cases[j].case_id,
            similarity_score: Math.random() * 0.3 + 0.6,
          });
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        generated: inserted,
        errors,
        citations: citationRecords.length,
        contradictions: contradictionRecords.length,
        similarities: similarityRecords.length,
        message: `Successfully generated ${inserted} synthetic legal cases`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating synthetic cases:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
