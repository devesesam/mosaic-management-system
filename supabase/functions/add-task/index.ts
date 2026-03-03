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
    const taskData = await req.json();
    console.log('Edge Function: add-task - Received data:', taskData);

    // Extract secondary workers if present
    const { secondary_worker_ids, ...taskBase } = taskData;

    // Insert the main task record
    const { data: newTask, error: taskError } = await supabase
      .from('tasks')
      .insert([taskBase])
      .select()
      .single();

    if (taskError) {
      console.error('Edge Function: add-task - Task creation error:', taskError);
      return new Response(
        JSON.stringify({
          success: false,
          error: taskError.message,
          details: taskError
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    console.log('Edge Function: add-task - Task created successfully:', newTask.id);

    // Handle secondary workers if provided
    if (secondary_worker_ids?.length) {
      const secondaryWorkerData = secondary_worker_ids.map((worker_id: string) => ({
        task_id: newTask.id,
        worker_id
      }));

      const { error: secondaryError } = await supabase
        .from('task_secondary_workers')
        .insert(secondaryWorkerData);

      if (secondaryError) {
        console.error('Edge Function: add-task - Secondary workers error:', secondaryError);
        // Continue despite error with secondary workers
      } else {
        console.log('Edge Function: add-task - Secondary workers added successfully');
      }
    }

    // Return the complete task with secondary workers
    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        ...newTask,
        secondary_worker_ids: secondary_worker_ids || []
      },
      message: `Task created successfully`
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
    console.error('Edge Function: add-task - Unexpected error:', err);

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
