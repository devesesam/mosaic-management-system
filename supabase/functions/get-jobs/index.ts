import { createClient } from 'npm:@supabase/supabase-js@2.39.3';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Initialize Supabase client using environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Edge Function: get-jobs - Starting query');

    // Query the jobs table
    const { data: jobs, error: jobsError, status, statusText } = await supabase
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false });

    console.log('Edge Function: get-jobs - Jobs query completed', {
      status,
      statusText,
      jobCount: jobs?.length || 0,
      error: jobsError?.message || 'none'
    });

    if (jobsError) {
      console.error('Edge Function: get-jobs - Database error:', jobsError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: jobsError.message,
          details: jobsError
        }),
        {
          status: 500,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        }
      );
    }

    // Fetch secondary workers for all jobs
    const { data: secondaryWorkers, error: secondaryError } = await supabase
      .from('job_secondary_workers')
      .select('*');

    console.log('Edge Function: get-jobs - Secondary workers query completed', {
      secondaryWorkerCount: secondaryWorkers?.length || 0,
      error: secondaryError?.message || 'none'
    });

    // Process jobs to ensure consistent format and add secondary workers
    const processedJobs = (jobs || []).map(job => ({
      ...job,
      start_date: job.start_date || null,
      end_date: job.end_date || null,
      status: job.status || 'Awaiting Order',
      tile_color: job.tile_color || '#3b82f6',
      secondary_worker_ids: (secondaryWorkers || [])
        .filter(sw => sw.job_id === job.id)
        .map(sw => sw.worker_id)
    }));

    // Return successful response
    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      data: processedJobs,
      count: processedJobs.length,
      message: `Successfully fetched ${processedJobs.length} jobs`,
      secondaryWorkersCount: secondaryWorkers?.length || 0
    };

    console.log('Edge Function: get-jobs - Returning response:', {
      jobCount: response.count,
      secondaryWorkersCount: response.secondaryWorkersCount
    });

    return new Response(
      JSON.stringify(response, null, 2),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    );

  } catch (err) {
    console.error('Edge Function: get-jobs - Unexpected error:', err);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error',
        message: err instanceof Error ? err.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    );
  }
});