import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const caselawApiKey = Deno.env.get('CASELAW_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { jurisdiction = 'us', limit = 100, offset = 0 } = await req.json();

    console.log(`Fetching cases from Caselaw Access Project - Jurisdiction: ${jurisdiction}, Limit: ${limit}`);

    // Fetch cases from Caselaw Access Project API
    const apiUrl = `https://api.case.law/v1/cases/?jurisdiction=${jurisdiction}&page_size=${limit}&offset=${offset}`;
    const headers: HeadersInit = {
      'Authorization': `Token ${caselawApiKey}`,
      'Content-Type': 'application/json',
    };

    const response = await fetch(apiUrl, { headers });
    
    if (!response.ok) {
      throw new Error(`Caselaw API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`Received ${data.results?.length || 0} cases from API`);

    // Process and insert cases
    const casesProcessed = [];
    const errors = [];

    for (const caseData of data.results || []) {
      try {
        // Extract relevant fields from the API response
        const caseRecord = {
          case_id: caseData.id.toString(),
          name: caseData.name || 'Untitled Case',
          name_abbreviation: caseData.name_abbreviation,
          court: caseData.court?.name || 'Unknown Court',
          decision_date: caseData.decision_date,
          jurisdiction: caseData.jurisdiction?.name,
          docket_number: caseData.docket_number,
          citations: caseData.citations || [],
          url: caseData.url,
          frontend_url: caseData.frontend_url,
          preview: caseData.preview || [],
          metadata: {
            reporter: caseData.reporter,
            volume: caseData.volume,
            first_page: caseData.first_page,
            last_page: caseData.last_page,
          }
        };

        // Insert or update case
        const { data: insertedCase, error: insertError } = await supabase
          .from('legal_cases')
          .upsert(caseRecord, { onConflict: 'case_id' })
          .select()
          .single();

        if (insertError) {
          console.error(`Error inserting case ${caseRecord.case_id}:`, insertError);
          errors.push({ case_id: caseRecord.case_id, error: insertError.message });
        } else {
          casesProcessed.push(insertedCase);
        }
      } catch (err) {
        console.error('Error processing case:', err);
        const errorMessage = err instanceof Error ? err.message : String(err);
        errors.push({ case_id: caseData.id, error: errorMessage });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: casesProcessed.length,
        errors: errors.length,
        total_available: data.count,
        next: data.next,
        cases: casesProcessed.slice(0, 10), // Return first 10 for preview
        error_details: errors.slice(0, 5), // Return first 5 errors if any
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in import-cases function:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMessage,
        details: errorStack 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});