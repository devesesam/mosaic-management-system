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

  // Only allow POST requests
  if (req.method !== "POST") {
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

    // Parse request body
    const jobData = await req.json();
    console.log('Edge Function: add-job - Received data:', jobData);

    // Extract secondary workers and prepare job data for insertion
    const secondary_worker_ids = jobData.secondary_worker_ids;
    const jobToInsert = { ...jobData };
    delete jobToInsert.secondary_worker_ids;

    // Insert the main job record
    const { data: newJob, error: jobError } = await supabase
      .from('jobs')
      .insert([jobToInsert])
      .select()
      .single();

    if (jobError) {
      console.error('Edge Function: add-job - Job creation error:', jobError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: jobError.message,
          details: jobError
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    // Check if newJob data is null or undefined
    if (!newJob) {
      console.error('Edge Function: add-job - No job data returned after insert');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to create job - no data returned',
          details: 'Insert operation completed but no job data was returned'
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    console.log('Edge Function: add-job - Job created successfully:', newJob.id);

    // Handle secondary workers if provided
    if (secondary_worker_ids?.length) {
      const secondaryWorkerData = secondary_worker_ids.map((worker_id: string) => ({
        job_id: newJob.id,
        worker_id
      }));

      const { error: secondaryError } = await supabase
        .from('job_secondary_workers')
        .insert(secondaryWorkerData);

      if (secondaryError) {
        console.error('Edge Function: add-job - Secondary workers error:', secondaryError);
        // Continue despite error with secondary workers
      } else {
        console.log('Edge Function: add-job - Secondary workers added successfully');
      }
    }

    // Return the complete job with secondary workers
    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        ...newJob,
        secondary_worker_ids: secondary_worker_ids || []
      },
      message: `Job created successfully`
    };

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    );

  } catch (err) {
    console.error('Edge Function: add-job - Unexpected error:', err);
    
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