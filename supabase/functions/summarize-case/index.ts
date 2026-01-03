import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { caseId, caseName, court, jurisdiction, fullText, headnotes } = await req.json();
    
    console.log(`Summarizing case: ${caseName} (${caseId})`);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build context for the AI
    const caseContext = `
Case Name: ${caseName}
Court: ${court}
Jurisdiction: ${jurisdiction || "Not specified"}
${headnotes ? `Headnotes: ${headnotes}` : ""}
${fullText ? `Full Text (excerpt): ${fullText.substring(0, 3000)}...` : ""}
    `.trim();

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a legal analyst specializing in case law summarization. Generate concise, professional case summaries that include:
1. The key legal issue(s) at stake
2. The court's holding/decision
3. The legal reasoning or precedent applied
4. The broader implications for similar cases

Keep summaries between 100-200 words. Use formal legal language but remain accessible.`
          },
          {
            role: "user",
            content: `Please summarize the following legal case:\n\n${caseContext}`
          }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage limit reached. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content;

    if (!summary) {
      throw new Error("No summary generated");
    }

    console.log(`Summary generated for case ${caseId}: ${summary.substring(0, 100)}...`);

    // Update the case in the database with the summary
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error: updateError } = await supabase
      .from("legal_cases")
      .update({ summary })
      .eq("id", caseId);

    if (updateError) {
      console.error("Failed to update case with summary:", updateError);
      // Still return the summary even if DB update fails
    }

    return new Response(JSON.stringify({ summary, caseId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Summarization error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
