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

  // Only allow PUT requests
  if (req.method !== "PUT") {
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
    const { id, updates } = await req.json();
    console.log('Edge Function: update-job - Updating job:', id, updates);

    if (!id) {
      return new Response(
        JSON.stringify({ success: false, error: "Job ID is required" }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    // Extract secondary workers if present
    const { secondary_worker_ids, ...jobUpdates } = updates;

    // Update the main job record
    const { data: updatedJob, error: jobError } = await supabase
      .from('jobs')
      .update(jobUpdates)
      .eq('id', id)
      .select()
      .single();

    if (jobError) {
      console.error('Edge Function: update-job - Job update error:', jobError);
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

    // Check if updatedJob data is null or undefined
    if (!updatedJob) {
      console.error('Edge Function: update-job - No job data returned after update');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to update job - no data returned',
          details: 'Update operation completed but no job data was returned'
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    console.log('Edge Function: update-job - Job updated successfully:', id);

    // Handle secondary workers if included in the updates
    if (secondary_worker_ids !== undefined) {
      // Delete existing secondary workers
      const { error: deleteError } = await supabase
        .from('job_secondary_workers')
        .delete()
        .eq('job_id', id);
        
      if (deleteError) {
        console.error('Edge Function: update-job - Error deleting secondary workers:', deleteError);
      }

      // Add new secondary workers if any
      if (secondary_worker_ids?.length) {
        const secondaryWorkerData = secondary_worker_ids.map((worker_id: string) => ({
          job_id: id,
          worker_id
        }));

        const { error: insertError } = await supabase
          .from('job_secondary_workers')
          .insert(secondaryWorkerData);
          
        if (insertError) {
          console.error('Edge Function: update-job - Error adding secondary workers:', insertError);
        }
      }
    }

    // Get final secondary workers for the response
    const { data: currentSecondaryWorkers } = await supabase
      .from('job_secondary_workers')
      .select('worker_id')
      .eq('job_id', id);

    // Return the complete updated job with secondary workers
    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        ...updatedJob,
        secondary_worker_ids: (currentSecondaryWorkers || []).map(sw => sw.worker_id)
      },
      message: `Job updated successfully`
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
    console.error('Edge Function: update-job - Unexpected error:', err);
    
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