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

  // Only allow DELETE requests
  if (req.method !== "DELETE") {
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
    const id = pathParts[pathParts.length - 1];

    console.log('Edge Function: delete-worker - Deleting worker:', id);

    if (!id || id === 'delete-worker') {
      return new Response(
        JSON.stringify({ success: false, error: "Worker ID is required" }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    // First update any jobs assigned to this worker
    const { error: jobsError } = await supabase
      .from('jobs')
      .update({ worker_id: null })
      .eq('worker_id', id);
      
    if (jobsError) {
      console.error('Edge Function: delete-worker - Error unassigning jobs:', jobsError);
      // Continue despite error
    }
    
    // Delete secondary worker assignments (will be handled by cascade)
    // Delete the worker
    const { error } = await supabase
      .from('workers')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Edge Function: delete-worker - Delete error:', error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: error.message,
          details: error
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    console.log('Edge Function: delete-worker - Worker deleted successfully:', id);

    // Return successful response
    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      message: `Worker deleted successfully`
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
    console.error('Edge Function: delete-worker - Unexpected error:', err);
    
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