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
    const courtListenerApiKey = Deno.env.get('COURTLISTENER_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    if (!courtListenerApiKey) {
      throw new Error('COURTLISTENER_API_KEY is not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { court = '', limit = 20, page = 1 } = await req.json();

    console.log(`Fetching cases from CourtListener API - Court: ${court || 'all'}, Limit: ${limit}, Page: ${page}`);

    // Fetch opinion clusters from CourtListener API
    let apiUrl = `https://www.courtlistener.com/api/rest/v4/clusters/?page_size=${limit}&page=${page}`;
    if (court) {
      apiUrl += `&court=${court}`;
    }

    const headers: HeadersInit = {
      'Authorization': `Token ${courtListenerApiKey}`,
      'Accept': 'application/json',
    };

    console.log(`Calling CourtListener API: ${apiUrl}`);
    const response = await fetch(apiUrl, { headers });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`CourtListener API error: ${response.status} ${response.statusText}`, errorText);
      throw new Error(`CourtListener API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`Received ${data.results?.length || 0} clusters from API`);

    // Process and insert cases
    const casesProcessed = [];
    const errors = [];

    for (const cluster of data.results || []) {
      try {
        // Fetch opinion details for this cluster
        let opinionText = '';
        let opinions = [];
        
        if (cluster.sub_opinions && cluster.sub_opinions.length > 0) {
          // Fetch first opinion for text content
          const opinionUrl = cluster.sub_opinions[0];
          try {
            const opinionResponse = await fetch(opinionUrl, { headers });
            if (opinionResponse.ok) {
              const opinionData = await opinionResponse.json();
              opinionText = opinionData.plain_text || opinionData.html_with_citations || '';
              opinions.push(opinionData);
            }
          } catch (opErr) {
            console.log(`Could not fetch opinion details: ${opErr}`);
          }
        }

        // Extract relevant fields from the cluster response
        const caseRecord = {
          case_id: cluster.id.toString(),
          name: cluster.case_name || 'Untitled Case',
          name_abbreviation: cluster.case_name_short || null,
          court: cluster.court || 'Unknown Court',
          decision_date: cluster.date_filed,
          jurisdiction: cluster.court_id || null,
          docket_number: cluster.docket_number || null,
          citations: cluster.citations || [],
          url: cluster.absolute_url ? `https://www.courtlistener.com${cluster.absolute_url}` : null,
          frontend_url: cluster.absolute_url ? `https://www.courtlistener.com${cluster.absolute_url}` : null,
          preview: cluster.syllabus ? [cluster.syllabus] : [],
          summary: cluster.syllabus || null,
          headnotes: cluster.headnotes || null,
          full_text: opinionText.substring(0, 50000), // Limit text size
          case_opinions: opinions,
          metadata: {
            source: 'courtlistener',
            judges: cluster.judges,
            nature_of_suit: cluster.nature_of_suit,
            precedential_status: cluster.precedential_status,
            date_blocked: cluster.date_blocked,
            blocked: cluster.blocked,
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
        console.error('Error processing cluster:', err);
        const errorMessage = err instanceof Error ? err.message : String(err);
        errors.push({ case_id: cluster.id, error: errorMessage });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: casesProcessed.length,
        errors: errors.length,
        total_available: data.count,
        next: data.next,
        previous: data.previous,
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
