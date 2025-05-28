import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';

let supabaseUrl = '';
let supabaseAnonKey = '';

try {
  supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase credentials');
  }
} catch (error) {
  console.error('Error loading Supabase credentials:', error);
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'supabase.auth.token'
  }
});

export const isSupabaseInitialized = () => {
  return Boolean(supabaseUrl && supabaseAnonKey);
};

// Simple function to check auth status
export const checkAuthStatus = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) {
    console.error('Auth check failed:', error);
    return null;
  }
  return session;
};

// DIRECT RAW QUERY for workers without any conditions
export const getWorkers = async () => {
  try {
    console.log('getWorkers: Starting fetch directly...');
    
    // Use a direct SQL query to bypass any potential issues
    const { data, error } = await supabase.rpc('admin_get_all_workers');
    
    if (error) {
      console.error('getWorkers: Error with RPC call:', error);
      
      // Fall back to direct query
      console.log('getWorkers: Falling back to direct query...');
      const { data: directData, error: directError } = await supabase
        .from('workers')
        .select('*');
      
      if (directError) {
        console.error('getWorkers: Direct query also failed:', directError);
        throw directError;
      }
      
      console.log('getWorkers: Direct query succeeded with', directData?.length || 0, 'workers');
      return directData || [];
    }
    
    console.log('getWorkers: RPC fetch succeeded with', data?.length || 0, 'workers');
    
    return data || [];
  } catch (error) {
    console.error('getWorkers: Exception during fetch:', error);
    
    // Last attempt with raw SQL
    try {
      console.log('getWorkers: Attempting raw SQL...');
      const { data, error: sqlError } = await supabase.rpc('emergency_get_workers');
      
      if (sqlError) {
        console.error('getWorkers: Raw SQL also failed:', sqlError);
        return []; // Return empty array as last resort
      }
      
      return data || [];
    } catch (finalError) {
      console.error('getWorkers: All attempts failed:', finalError);
      return []; // Return empty array as last resort
    }
  }
};

// DIRECT RAW QUERY for jobs without any conditions
export const getJobs = async () => {
  try {
    console.log('getJobs: Starting fetch directly...');
    
    // Use a direct RPC call first
    const { data: jobs, error: jobsError } = await supabase.rpc('admin_get_all_jobs');
    
    if (jobsError) {
      console.error('getJobs: Error with RPC call:', jobsError);
      
      // Fall back to direct query
      console.log('getJobs: Falling back to direct query...');
      const { data: directJobs, error: directError } = await supabase
        .from('jobs')
        .select('*');
      
      if (directError) {
        console.error('getJobs: Direct query also failed:', directError);
        throw directError;
      }
      
      console.log('getJobs: Direct query succeeded with', directJobs?.length || 0, 'jobs');
      
      // Now get secondary workers
      const { data: secondaryWorkers, error: secondaryError } = await supabase
        .from('job_secondary_workers')
        .select('*');
      
      if (secondaryError) {
        console.error('getJobs: Error fetching secondary workers:', secondaryError);
        // Continue anyway, we'll just have jobs without secondary workers
      }
      
      const jobsWithSecondaryWorkers = directJobs.map(job => ({
        ...job,
        secondary_worker_ids: (secondaryWorkers || [])
          .filter(sw => sw.job_id === job.id)
          .map(sw => sw.worker_id)
      }));
      
      return jobsWithSecondaryWorkers;
    }
    
    console.log('getJobs: RPC fetch succeeded with', jobs?.length || 0, 'jobs');
    
    // Get secondary workers
    const { data: secondaryWorkers, error: secondaryError } = await supabase
      .from('job_secondary_workers')
      .select('*');
    
    if (secondaryError) {
      console.error('getJobs: Error fetching secondary workers:', secondaryError);
      // Continue anyway, we'll just have jobs without secondary workers
    }
    
    const jobsWithSecondaryWorkers = jobs.map(job => ({
      ...job,
      secondary_worker_ids: (secondaryWorkers || [])
        .filter(sw => sw.job_id === job.id)
        .map(sw => sw.worker_id)
    }));
    
    return jobsWithSecondaryWorkers;
  } catch (error) {
    console.error('getJobs: Exception during fetch:', error);
    
    // Last attempt with standard query
    try {
      console.log('getJobs: Making one final attempt with standard query...');
      
      const { data, error: finalError } = await supabase
        .from('jobs')
        .select('*');
      
      if (finalError) {
        console.error('getJobs: Final attempt failed:', finalError);
        return []; // Return empty array as last resort
      }
      
      return data.map(job => ({
        ...job,
        secondary_worker_ids: []
      }));
    } catch (finalError) {
      console.error('getJobs: All attempts failed:', finalError);
      return []; // Return empty array as last resort
    }
  }
};

export const createJob = async (job: Omit<Database['public']['Tables']['jobs']['Insert'], 'id' | 'created_at'>) => {
  try {
    if (!isSupabaseInitialized()) {
      throw new Error('Supabase is not properly initialized');
    }

    console.log('createJob: Creating new job:', job);
    const { secondary_worker_ids, ...jobData } = job as any;
    
    const { data: newJob, error: jobError } = await supabase
      .from('jobs')
      .insert([jobData])
      .select()
      .single();
    
    if (jobError) {
      console.error('Error creating job:', jobError);
      throw jobError;
    }

    console.log('createJob: Job created successfully:', newJob);
    
    if (secondary_worker_ids?.length) {
      const secondaryWorkerData = secondary_worker_ids.map(worker_id => ({
        job_id: newJob.id,
        worker_id
      }));

      console.log('createJob: Adding secondary workers:', secondaryWorkerData);
      const { error: secondaryError } = await supabase
        .from('job_secondary_workers')
        .insert(secondaryWorkerData);

      if (secondaryError) {
        console.error('Error adding secondary workers:', secondaryError);
        throw secondaryError;
      }
    }
    
    return {
      ...newJob,
      secondary_worker_ids: secondary_worker_ids || []
    };
  } catch (error) {
    console.error('Error in createJob:', error);
    throw error;
  }
};

export const updateJob = async (id: string, updates: Partial<Database['public']['Tables']['jobs']['Update']>) => {
  try {
    if (!isSupabaseInitialized()) {
      throw new Error('Supabase is not properly initialized');
    }

    console.log('updateJob: Updating job:', { id, updates });
    
    const { secondary_worker_ids, ...jobUpdates } = updates as any;
    
    const { data: updatedJob, error: jobError } = await supabase
      .from('jobs')
      .update(jobUpdates)
      .eq('id', id)
      .select()
      .single();
    
    if (jobError) {
      console.error('Error updating job:', jobError);
      throw jobError;
    }

    console.log('updateJob: Job updated successfully:', updatedJob);

    if (secondary_worker_ids !== undefined) {
      const { error: deleteError } = await supabase
        .from('job_secondary_workers')
        .delete()
        .eq('job_id', id);

      if (deleteError) {
        console.error('Error deleting secondary workers:', deleteError);
        throw deleteError;
      }

      if (secondary_worker_ids?.length) {
        const secondaryWorkerData = secondary_worker_ids.map(worker_id => ({
          job_id: id,
          worker_id
        }));

        console.log('updateJob: Adding new secondary workers:', secondaryWorkerData);
        const { error: insertError } = await supabase
          .from('job_secondary_workers')
          .insert(secondaryWorkerData);

        if (insertError) {
          console.error('Error adding secondary workers:', insertError);
          throw insertError;
        }
      }
    }

    const { data: currentSecondaryWorkers, error: fetchError } = await supabase
      .from('job_secondary_workers')
      .select('worker_id')
      .eq('job_id', id);

    if (fetchError) {
      console.error('Error fetching current secondary workers:', fetchError);
      throw fetchError;
    }

    const finalJob = {
      ...updatedJob,
      secondary_worker_ids: currentSecondaryWorkers.map(sw => sw.worker_id)
    };
    
    return finalJob;
  } catch (error) {
    console.error('Error in updateJob:', error);
    throw error;
  }
};

export const deleteJob = async (id: string) => {
  try {
    if (!isSupabaseInitialized()) {
      throw new Error('Supabase is not properly initialized');
    }

    console.log('deleteJob: Deleting job:', id);
    const { error } = await supabase
      .from('jobs')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting job:', error);
      throw error;
    }
    
    console.log('deleteJob: Job deleted successfully');
  } catch (error) {
    console.error('Error in deleteJob:', error);
    throw error;
  }
};

export const createWorker = async (worker: Omit<Database['public']['Tables']['workers']['Insert'], 'id' | 'created_at'>) => {
  try {
    if (!isSupabaseInitialized()) {
      throw new Error('Supabase is not properly initialized');
    }

    console.log('createWorker: Creating worker:', worker);
    const { data, error } = await supabase
      .from('workers')
      .insert([worker])
      .select()
      .single();

    if (error) {
      console.error('Error creating worker:', error);
      throw error;
    }

    console.log('createWorker: Worker created successfully:', data);
    return data;
  } catch (error) {
    console.error('Error in createWorker:', error);
    throw error;
  }
};

export const getWorkerJobs = async (workerId: string) => {
  try {
    if (!isSupabaseInitialized()) {
      throw new Error('Supabase is not properly initialized');
    }

    console.log('getWorkerJobs: Fetching jobs for worker:', workerId);
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('worker_id', workerId);

    if (error) {
      console.error('Error fetching worker jobs:', error);
      throw error;
    }

    console.log(`getWorkerJobs: Found ${data?.length || 0} jobs for worker ${workerId}`);
    return data || [];
  } catch (error) {
    console.error('Error in getWorkerJobs:', error);
    throw error;
  }
};

export const deleteWorker = async (id: string) => {
  try {
    if (!isSupabaseInitialized()) {
      throw new Error('Supabase is not properly initialized');
    }

    console.log('deleteWorker: Deleting worker:', id);
    const { error } = await supabase.rpc('delete_worker_with_jobs', {
      worker_id: id
    });

    if (error) {
      console.error('Error in deleteWorker:', error);
      throw error;
    }

    console.log('deleteWorker: Worker deleted successfully');
    return true;
  } catch (error) {
    console.error('Error in deleteWorker:', error);
    throw error;
  }
};

export const checkRLSPolicies = async () => {
  try {
    console.log('Checking RLS policies...');
    
    // Try to read from workers table
    const { data: workers, error: workersError } = await supabase
      .from('workers')
      .select('*')
      .limit(5);
    
    if (workersError) {
      console.error('RLS Check: Error reading workers:', workersError);
    } else {
      console.log(`RLS Check: Successfully read ${workers.length} workers`);
    }
    
    // Try to read from jobs table
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select('*')
      .limit(5);
    
    if (jobsError) {
      console.error('RLS Check: Error reading jobs:', jobsError);
    } else {
      console.log(`RLS Check: Successfully read ${jobs.length} jobs`);
    }
    
    // Try to read secondary workers
    const { data: secondaryWorkers, error: swError } = await supabase
      .from('job_secondary_workers')
      .select('*')
      .limit(5);
    
    if (swError) {
      console.error('RLS Check: Error reading job_secondary_workers:', swError);
    } else {
      console.log(`RLS Check: Successfully read ${secondaryWorkers.length} secondary worker assignments`);
    }
    
    return {
      canReadWorkers: !workersError,
      canReadJobs: !jobsError,
      canReadSecondaryWorkers: !swError
    };
  } catch (error) {
    console.error('Error checking RLS policies:', error);
    throw error;
  }
};