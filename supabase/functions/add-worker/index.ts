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
    const workerData = await req.json();
    console.log('Edge Function: add-worker - Received data:', workerData);

    // Validate required fields
    if (!workerData.name || !workerData.name.trim()) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Worker name is required",
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    if (!workerData.email || !workerData.email.trim()) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Email address is required",
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    // Ensure role is set to admin (application requirement)
    const workerWithRole = {
      ...workerData,
      email: workerData.email.trim(),
      name: workerData.name.trim(),
      role: 'admin'
    };

    // Insert the worker record (not upsert - we want to catch duplicates)
    const { data: newWorker, error } = await supabase
      .from('workers')
      .insert([workerWithRole])
      .select()
      .single();

    if (error) {
      console.error('Edge Function: add-worker - Worker creation error:', error);
      
      // Handle specific database errors
      if (error.code === '23505' || error.message.includes('duplicate') || error.message.includes('unique')) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `A worker with email "${workerData.email}" already exists. Please use a different email address.`,
            code: 'DUPLICATE_EMAIL'
          }),
          {
            status: 409, // Conflict
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: error.message || 'Failed to create worker',
          details: error
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    console.log('Edge Function: add-worker - Worker created successfully:', newWorker.id);

    // Return successful response
    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      data: newWorker,
      message: `Worker created successfully`
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
    console.error('Edge Function: add-worker - Unexpected error:', err);
    
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