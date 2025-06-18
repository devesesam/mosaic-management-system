import { supabase, handleSupabaseError, ensureConnection } from './supabaseClient';
import { Worker } from '../types';

/**
 * Get all workers from the database
 */
export const getAllWorkers = async (): Promise<Worker[]> => {
  try {
    console.log('WorkersAPI: Fetching all workers');
    
    // Ensure connection is tested
    await ensureConnection();
    
    // Log immediately before the actual Supabase call
    console.log('WorkersAPI: CRITICAL - About to execute supabase.from("workers").select()');
    console.time('WorkersAPI: workers query execution time');
    
    // Fetch workers with detailed error handling
    const { data, error, status, statusText } = await supabase
      .from('workers')
      .select('*')
      .order('name');
    
    console.timeEnd('WorkersAPI: workers query execution time');
    console.log('WorkersAPI: CRITICAL - Supabase workers query completed with status:', status, statusText);
    
    // DETAILED LOGGING - Log the raw response
    console.log('WorkersAPI: RAW RESPONSE DATA:', {
      data: data,
      error: error,
      status: status,
      statusText: statusText,
      dataType: typeof data,
      dataLength: data ? data.length : 'null/undefined',
      errorDetails: error ? {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      } : 'no error'
    });
    
    if (error) {
      console.error('WorkersAPI: CRITICAL ERROR - Failed to fetch workers:', error);
      console.log('WorkersAPI: Error details:', JSON.stringify(error, null, 2));
      throw new Error(`Failed to fetch workers: ${error.message || 'Unknown database error'}`);
    }
    
    console.log('WorkersAPI: Workers data received, count:', data?.length || 0);
    
    if (data && data.length > 0) {
      console.log('WorkersAPI: First worker sample:', {
        id: data[0].id,
        name: data[0].name,
        email: data[0].email || 'null'
      });
      console.log('WorkersAPI: All worker names:', data.map(w => w.name));
    } else {
      console.warn('WorkersAPI: NO WORKERS RETURNED - data is empty or null');
      console.log('WorkersAPI: Checking if this is a permissions issue...');
      
      // Try a simple count query to test permissions
      try {
        const { count, error: countError } = await supabase
          .from('workers')
          .select('*', { count: 'exact', head: true });
        
        console.log('WorkersAPI: Count query result:', { count, countError });
      } catch (countErr) {
        console.error('WorkersAPI: Count query failed:', countErr);
      }
    }
    
    return data || [];
  } catch (error) {
    console.error('WorkersAPI: CRITICAL - Exception during worker fetching:', error);
    throw handleSupabaseError(error);
  }
};

/**
 * Create a new worker
 */
export const createWorker = async (workerData: Omit<Worker, 'id' | 'created_at'>): Promise<Worker> => {
  try {
    console.log('WorkersAPI: Creating worker');
    
    await ensureConnection();
    
    // Make sure role is set to admin (application requirement)
    const workerWithRole = {
      ...workerData,
      role: 'admin'
    };
    
    console.log('WorkersAPI: CRITICAL - About to insert new worker');
    console.log('WorkersAPI: Worker data:', JSON.stringify(workerWithRole, null, 2));
    
    const { data, error, status } = await supabase
      .from('workers')
      .insert([workerWithRole])
      .select()
      .single();
    
    console.log('WorkersAPI: Worker creation completed with status:', status);

    if (error) {
      console.error('WorkersAPI: Error creating worker:', error);
      console.log('WorkersAPI: Error details:', JSON.stringify(error, null, 2));
      throw new Error(`Failed to create worker: ${error.message || 'Unknown database error'}`);
    }

    console.log('WorkersAPI: Worker created successfully:', data.id);
    return data;
  } catch (error) {
    console.error('WorkersAPI: Exception during worker creation:', error);
    throw handleSupabaseError(error);
  }
};

/**
 * Delete a worker and handle any assigned jobs
 */
export const deleteWorker = async (id: string): Promise<void> => {
  try {
    console.log('WorkersAPI: Deleting worker:', id);
    
    await ensureConnection();
    
    // First update any jobs assigned to this worker
    // The database foreign key constraint `ON DELETE SET NULL` on `jobs.worker_id`
    // will automatically set `worker_id` to null when the worker is deleted.
    // However, explicitly updating here ensures the application's intent is clear
    // and handles cases where the DB constraint might be different or for immediate UI updates.
    console.log('WorkersAPI: CRITICAL - About to unassign worker from jobs');
    const { error: jobsError, status: jobsStatus } = await supabase
      .from('jobs')
      .update({ worker_id: null })
      .eq('worker_id', id);
    
    console.log('WorkersAPI: Job unassignment completed with status:', jobsStatus);
      
    if (jobsError) {
      console.error('WorkersAPI: Error unassigning jobs:', jobsError);
      // Continue despite error
    }
    
    // Secondary worker assignments will be cascade deleted by the foreign key
    // constraint `ON DELETE CASCADE` on `job_secondary_workers.worker_id`.
    console.log('WorkersAPI: Secondary assignments will be cascade deleted by DB');
    
    // Finally delete the worker
    console.log('WorkersAPI: CRITICAL - About to delete worker');
    const { error, status } = await supabase
      .from('workers')
      .delete()
      .eq('id', id);
    
    console.log('WorkersAPI: Worker deletion completed with status:', status);

    if (error) {
      console.error('WorkersAPI: Error deleting worker:', error);
      console.log('WorkersAPI: Error details:', JSON.stringify(error, null, 2));
      throw new Error(`Failed to delete worker: ${error.message || 'Unknown database error'}`);
    }

    console.log('WorkersAPI: Worker deleted successfully:', id);
  } catch (error) {
    console.error('WorkersAPI: Exception during worker deletion:', error);
    throw handleSupabaseError(error);
  }
};

/**
 * Get a worker by email
 */
export const getWorkerByEmail = async (email: string): Promise<Worker | null> => {
  try {
    console.log('WorkersAPI: Fetching worker by email:', email);
    
    await ensureConnection();
    
    console.log('WorkersAPI: CRITICAL - About to query worker by email');
    const { data, error, status } = await supabase
      .from('workers')
      .select('*')
      .eq('email', email)
      .maybeSingle();
    
    console.log('WorkersAPI: Worker by email query completed with status:', status);
    
    if (error) {
      console.error('WorkersAPI: Error fetching worker by email:', error);
      console.log('WorkersAPI: Error details:', JSON.stringify(error, null, 2));
      throw new Error(`Failed to fetch worker: ${error.message || 'Unknown database error'}`);
    }
    
    if (data) {
      console.log('WorkersAPI: Worker found:', data.id);
    } else {
      console.log('WorkersAPI: No worker found with email:', email);
    }
    
    return data;
  } catch (error) {
    console.error('WorkersAPI: Exception fetching worker by email:', error);
    throw handleSupabaseError(error);
  }
};

/**
 * Create or update a worker profile for a user
 */
export const createOrUpdateWorkerProfile = async (email: string, name?: string): Promise<Worker> => {
  try {
    console.log(`WorkersAPI: Creating/updating worker profile for ${email}`);
    
    await ensureConnection();
    
    const workerData = {
      name: name || email.split('@')[0],
      email: email,
      role: 'admin'
    };
    
    console.log('WorkersAPI: CRITICAL - About to upsert worker profile');
    console.log('WorkersAPI: Worker data:', JSON.stringify(workerData, null, 2));
    
    const { data, error, status } = await supabase
      .from('workers')
      .upsert(
        workerData,
        { 
          onConflict: 'email',
          ignoreDuplicates: false
        }
      )
      .select()
      .single();
    
    console.log('WorkersAPI: Worker upsert completed with status:', status);
      
    if (error) {
      console.error('WorkersAPI: Error creating/updating worker profile:', error);
      console.log('WorkersAPI: Error details:', JSON.stringify(error, null, 2));
      throw new Error(`Failed to create/update worker: ${error.message || 'Unknown database error'}`);
    }
    
    console.log('WorkersAPI: Worker profile created/updated:', data.id);
    return data;
  } catch (error) {
    console.error('WorkersAPI: Exception creating/updating worker profile:', error);
    throw handleSupabaseError(error);
  }
};