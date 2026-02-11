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

    console.log('Edge Function: get-workers - Starting query');

    // Query the workers table
    const { data: workers, error, status, statusText } = await supabase
      .from('workers')
      .select('*')
      .order('name');

    console.log('Edge Function: get-workers - Query completed', {
      status,
      statusText,
      workerCount: workers?.length || 0,
      error: error?.message || 'none'
    });

    if (error) {
      console.error('Edge Function: get-workers - Database error:', error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: error.message,
          details: error
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

    // Return successful response
    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      data: workers || [],
      count: workers?.length || 0,
      message: `Successfully fetched ${workers?.length || 0} workers`
    };

    console.log('Edge Function: get-workers - Returning response:', response);

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
    console.error('Edge Function: get-workers - Unexpected error:', err);
    
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