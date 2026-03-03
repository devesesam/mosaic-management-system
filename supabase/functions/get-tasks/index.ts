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

    console.log('Edge Function: get-tasks - Starting query');

    // Query the tasks table
    const { data: tasks, error: tasksError, status, statusText } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    console.log('Edge Function: get-tasks - Tasks query completed', {
      status,
      statusText,
      taskCount: tasks?.length || 0,
      error: tasksError?.message || 'none'
    });

    if (tasksError) {
      console.error('Edge Function: get-tasks - Database error:', tasksError);
      return new Response(
        JSON.stringify({
          success: false,
          error: tasksError.message,
          details: tasksError
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

    // Fetch secondary workers for all tasks
    const { data: secondaryWorkers, error: secondaryError } = await supabase
      .from('task_secondary_workers')
      .select('*');

    console.log('Edge Function: get-tasks - Secondary workers query completed', {
      secondaryWorkerCount: secondaryWorkers?.length || 0,
      error: secondaryError?.message || 'none'
    });

    // Process tasks to ensure consistent format and add secondary workers
    const processedTasks = (tasks || []).map(task => ({
      ...task,
      start_date: task.start_date || null,
      end_date: task.end_date || null,
      status: task.status || 'Not Started',
      tile_color: task.tile_color || '#3b82f6',
      secondary_worker_ids: (secondaryWorkers || [])
        .filter(sw => sw.task_id === task.id)
        .map(sw => sw.worker_id)
    }));

    // Return successful response
    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      data: processedTasks,
      count: processedTasks.length,
      message: `Successfully fetched ${processedTasks.length} tasks`,
      secondaryWorkersCount: secondaryWorkers?.length || 0
    };

    console.log('Edge Function: get-tasks - Returning response:', {
      taskCount: response.count,
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
    console.error('Edge Function: get-tasks - Unexpected error:', err);

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
