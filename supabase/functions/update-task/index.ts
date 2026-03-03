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
    console.log('Edge Function: update-task - Updating task:', id, updates);

    if (!id) {
      return new Response(
        JSON.stringify({ success: false, error: "Task ID is required" }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    // Extract secondary workers if present
    const { secondary_worker_ids, ...taskUpdates } = updates;

    // Update the main task record
    const { data: updatedTask, error: taskError } = await supabase
      .from('tasks')
      .update(taskUpdates)
      .eq('id', id)
      .select()
      .single();

    if (taskError) {
      console.error('Edge Function: update-task - Task update error:', taskError);
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

    console.log('Edge Function: update-task - Task updated successfully:', id);

    // Handle secondary workers if included in the updates
    if (secondary_worker_ids !== undefined) {
      // Delete existing secondary workers
      const { error: deleteError } = await supabase
        .from('task_secondary_workers')
        .delete()
        .eq('task_id', id);

      if (deleteError) {
        console.error('Edge Function: update-task - Error deleting secondary workers:', deleteError);
      }

      // Add new secondary workers if any
      if (secondary_worker_ids?.length) {
        const secondaryWorkerData = secondary_worker_ids.map((worker_id: string) => ({
          task_id: id,
          worker_id
        }));

        const { error: insertError } = await supabase
          .from('task_secondary_workers')
          .insert(secondaryWorkerData);

        if (insertError) {
          console.error('Edge Function: update-task - Error adding secondary workers:', insertError);
        }
      }
    }

    // Get final secondary workers for the response
    const { data: currentSecondaryWorkers } = await supabase
      .from('task_secondary_workers')
      .select('worker_id')
      .eq('task_id', id);

    // Return the complete updated task with secondary workers
    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        ...updatedTask,
        secondary_worker_ids: (currentSecondaryWorkers || []).map(sw => sw.worker_id)
      },
      message: `Task updated successfully`
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
    console.error('Edge Function: update-task - Unexpected error:', err);

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
