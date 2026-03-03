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

    console.log('Edge Function: get-tasks-by-worker - Fetching tasks for worker:', workerId);

    if (!workerId || workerId === 'get-tasks-by-worker') {
      return new Response(
        JSON.stringify({ success: false, error: "Worker ID is required" }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    // Query tasks where worker is primary assignee
    const { data: primaryTasks, error: primaryError } = await supabase
      .from('tasks')
      .select('*')
      .eq('worker_id', workerId)
      .order('created_at', { ascending: false });

    if (primaryError) {
      console.error('Edge Function: get-tasks-by-worker - Primary tasks query error:', primaryError);
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

    // Query tasks where worker is secondary assignee
    const { data: secondaryTaskIds, error: secondaryError } = await supabase
      .from('task_secondary_workers')
      .select('task_id')
      .eq('worker_id', workerId);

    if (secondaryError) {
      console.error('Edge Function: get-tasks-by-worker - Secondary tasks query error:', secondaryError);
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

    // Fetch the actual task records for secondary assignments
    let secondaryTasks: any[] = [];
    if (secondaryTaskIds && secondaryTaskIds.length > 0) {
      const taskIds = secondaryTaskIds.map(item => item.task_id);

      const { data: secTasks, error: secTasksError } = await supabase
        .from('tasks')
        .select('*')
        .in('id', taskIds)
        .order('created_at', { ascending: false });

      if (secTasksError) {
        console.error('Edge Function: get-tasks-by-worker - Secondary task details query error:', secTasksError);
        // Continue without secondary tasks rather than failing
      } else {
        secondaryTasks = secTasks || [];
      }
    }

    // Combine primary and secondary tasks, removing duplicates
    const allTaskIds = new Set();
    const combinedTasks: any[] = [];

    // Add primary tasks first
    (primaryTasks || []).forEach(task => {
      if (!allTaskIds.has(task.id)) {
        allTaskIds.add(task.id);
        combinedTasks.push(task);
      }
    });

    // Add secondary tasks (that aren't already included as primary)
    secondaryTasks.forEach(task => {
      if (!allTaskIds.has(task.id)) {
        allTaskIds.add(task.id);
        combinedTasks.push(task);
      }
    });

    // Fetch all secondary worker assignments for the returned tasks
    const { data: allSecondaryWorkers, error: allSecondaryError } = await supabase
      .from('task_secondary_workers')
      .select('*');

    if (allSecondaryError) {
      console.error('Edge Function: get-tasks-by-worker - All secondary workers query error:', allSecondaryError);
      // Continue without secondary worker data
    }

    // Process tasks to ensure consistent format and add secondary workers
    const processedTasks = combinedTasks.map(task => ({
      ...task,
      start_date: task.start_date || null,
      end_date: task.end_date || null,
      status: task.status || 'Not Started',
      tile_color: task.tile_color || '#3b82f6',
      secondary_worker_ids: (allSecondaryWorkers || [])
        .filter(sw => sw.task_id === task.id)
        .map(sw => sw.worker_id)
    }));

    console.log('Edge Function: get-tasks-by-worker - Tasks found:', {
      primaryTasks: primaryTasks?.length || 0,
      secondaryTasks: secondaryTasks.length,
      totalUnique: processedTasks.length,
      workerId
    });

    // Return successful response
    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      data: processedTasks,
      count: processedTasks.length,
      breakdown: {
        primaryTasks: primaryTasks?.length || 0,
        secondaryTasks: secondaryTasks.length,
        totalUnique: processedTasks.length
      },
      message: `Successfully fetched ${processedTasks.length} tasks for worker ${workerId}`
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
    console.error('Edge Function: get-tasks-by-worker - Unexpected error:', err);

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
