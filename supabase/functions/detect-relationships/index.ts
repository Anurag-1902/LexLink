import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { newCaseId, newCaseName, newCaseSummary, newCaseCourt, newCaseJurisdiction } = await req.json();
    
    console.log("Detecting relationships for:", newCaseName);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Get existing cases from database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: existingCases, error: fetchError } = await supabase
      .from('legal_cases')
      .select('id, name, summary, court, jurisdiction')
      .neq('id', newCaseId)
      .limit(50);

    if (fetchError) {
      console.error("Error fetching cases:", fetchError);
      throw fetchError;
    }

    if (!existingCases || existingCases.length === 0) {
      console.log("No existing cases to compare");
      return new Response(
        JSON.stringify({ relationships: [], message: "No existing cases to analyze" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build context for AI
    const casesContext = existingCases.map(c => 
      `ID: ${c.id}\nName: ${c.name}\nCourt: ${c.court}\nJurisdiction: ${c.jurisdiction || 'Unknown'}\nSummary: ${c.summary || 'No summary'}`
    ).join('\n\n---\n\n');

    const prompt = `You are a legal AI expert analyzing case relationships. Given a NEW case and EXISTING cases, identify potential relationships.

NEW CASE:
Name: ${newCaseName}
Court: ${newCaseCourt}
Jurisdiction: ${newCaseJurisdiction || 'Unknown'}
Summary: ${newCaseSummary || 'No summary available'}

EXISTING CASES:
${casesContext}

Analyze and identify:
1. CITATIONS: Cases the new case might cite or be cited by (based on legal topic similarity)
2. SIMILARITIES: Cases with similar legal issues, outcomes, or reasoning
3. CONTRADICTIONS: Cases that may conflict with or contradict the new case

For each relationship found, you MUST use the exact case ID from the existing cases list.

Respond with a JSON object in this exact format:
{
  "citations": [
    { "targetCaseId": "exact-uuid-from-list", "targetCaseName": "case name", "reason": "why this citation relationship exists" }
  ],
  "similarities": [
    { "targetCaseId": "exact-uuid-from-list", "targetCaseName": "case name", "score": 0.85, "reason": "why these cases are similar" }
  ],
  "contradictions": [
    { "targetCaseId": "exact-uuid-from-list", "targetCaseName": "case name", "conflictType": "Reasoning Reversal|Temporal Conflict|Jurisdictional Divergence|Doctrinal Shift", "confidence": 0.75, "description": "explanation of the conflict" }
  ]
}

Only include relationships you're confident about. If no relationships exist, return empty arrays.`;

    console.log("Calling AI for relationship detection...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a legal AI expert that analyzes case relationships. Always respond with valid JSON only, no markdown." },
          { role: "user", content: prompt }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI usage limit reached. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content;
    
    console.log("AI Response:", content);

    // Parse the JSON response
    let relationships;
    try {
      // Clean up the response - remove markdown code blocks if present
      let cleanContent = content.trim();
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.slice(7);
      }
      if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.slice(3);
      }
      if (cleanContent.endsWith('```')) {
        cleanContent = cleanContent.slice(0, -3);
      }
      relationships = JSON.parse(cleanContent.trim());
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      relationships = { citations: [], similarities: [], contradictions: [] };
    }

    // Validate that target case IDs exist
    const validCaseIds = new Set(existingCases.map(c => c.id));
    
    relationships.citations = (relationships.citations || []).filter(
      (c: any) => validCaseIds.has(c.targetCaseId)
    );
    relationships.similarities = (relationships.similarities || []).filter(
      (s: any) => validCaseIds.has(s.targetCaseId)
    );
    relationships.contradictions = (relationships.contradictions || []).filter(
      (c: any) => validCaseIds.has(c.targetCaseId)
    );

    console.log("Detected relationships:", relationships);

    return new Response(
      JSON.stringify({ 
        relationships,
        newCaseId,
        analyzedCasesCount: existingCases.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error in detect-relationships:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
