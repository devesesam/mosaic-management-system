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

  // Only allow GET requests
  if (req.method !== "GET") {
    return new Response(
      JSON.stringify({ success: false, error: "Method not allowed" }),
      {
        status: 405,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );
  }

  try {
    // Initialize Supabase client using environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get worker ID from URL path
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const workerId = pathParts[pathParts.length - 1];

    console.log('Edge Function: get-jobs-by-worker - Fetching jobs for worker:', workerId);

    if (!workerId || workerId === 'get-jobs-by-worker') {
      return new Response(
        JSON.stringify({ success: false, error: "Worker ID is required" }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    // Query jobs where worker is primary assignee
    const { data: primaryJobs, error: primaryError } = await supabase
      .from('jobs')
      .select('*')
      .eq('worker_id', workerId)
      .order('created_at', { ascending: false });

    if (primaryError) {
      console.error('Edge Function: get-jobs-by-worker - Primary jobs query error:', primaryError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: primaryError.message,
          details: primaryError
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    // Query jobs where worker is secondary assignee
    const { data: secondaryJobIds, error: secondaryError } = await supabase
      .from('job_secondary_workers')
      .select('job_id')
      .eq('worker_id', workerId);

    if (secondaryError) {
      console.error('Edge Function: get-jobs-by-worker - Secondary jobs query error:', secondaryError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: secondaryError.message,
          details: secondaryError
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    // Fetch the actual job records for secondary assignments
    let secondaryJobs: any[] = [];
    if (secondaryJobIds && secondaryJobIds.length > 0) {
      const jobIds = secondaryJobIds.map(item => item.job_id);
      
      const { data: secJobs, error: secJobsError } = await supabase
        .from('jobs')
        .select('*')
        .in('id', jobIds)
        .order('created_at', { ascending: false });

      if (secJobsError) {
        console.error('Edge Function: get-jobs-by-worker - Secondary job details query error:', secJobsError);
        // Continue without secondary jobs rather than failing
      } else {
        secondaryJobs = secJobs || [];
      }
    }

    // Combine primary and secondary jobs, removing duplicates
    const allJobIds = new Set();
    const combinedJobs: any[] = [];

    // Add primary jobs first
    (primaryJobs || []).forEach(job => {
      if (!allJobIds.has(job.id)) {
        allJobIds.add(job.id);
        combinedJobs.push(job);
      }
    });

    // Add secondary jobs (that aren't already included as primary)
    secondaryJobs.forEach(job => {
      if (!allJobIds.has(job.id)) {
        allJobIds.add(job.id);
        combinedJobs.push(job);
      }
    });

    // Fetch all secondary worker assignments for the returned jobs
    const { data: allSecondaryWorkers, error: allSecondaryError } = await supabase
      .from('job_secondary_workers')
      .select('*');

    if (allSecondaryError) {
      console.error('Edge Function: get-jobs-by-worker - All secondary workers query error:', allSecondaryError);
      // Continue without secondary worker data
    }

    // Process jobs to ensure consistent format and add secondary workers
    const processedJobs = combinedJobs.map(job => ({
      ...job,
      start_date: job.start_date || null,
      end_date: job.end_date || null,
      status: job.status || 'Awaiting Order',
      tile_color: job.tile_color || '#3b82f6',
      secondary_worker_ids: (allSecondaryWorkers || [])
        .filter(sw => sw.job_id === job.id)
        .map(sw => sw.worker_id)
    }));

    console.log('Edge Function: get-jobs-by-worker - Jobs found:', {
      primaryJobs: primaryJobs?.length || 0,
      secondaryJobs: secondaryJobs.length,
      totalUnique: processedJobs.length,
      workerId
    });

    // Return successful response
    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      data: processedJobs,
      count: processedJobs.length,
      breakdown: {
        primaryJobs: primaryJobs?.length || 0,
        secondaryJobs: secondaryJobs.length,
        totalUnique: processedJobs.length
      },
      message: `Successfully fetched ${processedJobs.length} jobs for worker ${workerId}`
    };

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
    console.error('Edge Function: get-jobs-by-worker - Unexpected error:', err);
    
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