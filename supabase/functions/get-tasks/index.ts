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

    // Extract query parameters for visibility filtering
    const url = new URL(req.url);
    const reqWorkerId = url.searchParams.get('workerId');
    const isAdmin = url.searchParams.get('isAdmin') === 'true';

    console.log('Edge Function: get-tasks - Filters:', { reqWorkerId, isAdmin });

    // Process tasks to ensure consistent format and add secondary workers
    let processedTasks = (tasks || []).map(task => {
      const secondaryIds = (secondaryWorkers || [])
        .filter(sw => sw.task_id === task.id)
        .map(sw => sw.worker_id);

      return {
        ...task,
        start_date: task.start_date || null,
        end_date: task.end_date || null,
        status: task.status || 'Not Started',
        tile_color: task.tile_color || '#3b82f6',
        is_visible: task.is_visible !== false, // default true
        secondary_worker_ids: secondaryIds
      };
    });

    // Apply visibility filtering if not an admin
    if (!isAdmin) {
      processedTasks = processedTasks.filter(task => {
        if (task.is_visible) return true; // Visible to everyone

        // Private task: Check if the requesting worker is assigned
        if (reqWorkerId) {
          if (task.worker_id === reqWorkerId) return true;
          if (task.secondary_worker_ids.includes(reqWorkerId)) return true;
        }

        return false; // Not visible to this user
      });
    }

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
