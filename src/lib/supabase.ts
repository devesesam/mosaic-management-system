import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';

// Create Supabase client
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

// Create the client with connection options for better performance
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  },
  global: {
    fetch: (...args) => fetch(...args)
  },
  db: {
    schema: 'public'
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

export const isSupabaseInitialized = () => {
  return Boolean(supabaseUrl && supabaseAnonKey);
};

// Add function to check auth status
export const checkAuthStatus = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) {
    console.error('Auth check failed:', error);
    return null;
  }
  return session;
};

// DIRECT TABLE ACCESS FUNCTIONS

// Get all workers with improved error handling
export const getWorkers = async () => {
  try {
    console.log('Getting workers...');
    
    const { data, error, status } = await supabase
      .from('workers')
      .select('*')
      .order('name');
    
    if (error) {
      console.error('Error fetching workers:', error);
      throw new Error(`Failed to fetch workers: ${error.message}`);
    }
    
    console.log(`Successfully loaded ${data?.length || 0} workers`);
    return data || [];
  } catch (error) {
    console.error('Critical error in getWorkers:', error);
    throw error;
  }
};

// Get all jobs with improved error handling
export const getJobs = async () => {
  try {
    console.log('Getting jobs...');
    
    // Fetch jobs directly without timeout
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (jobsError) {
      console.error('Error fetching jobs:', jobsError);
      throw new Error(`Failed to fetch jobs: ${jobsError.message}`);
    }

    // Process jobs to ensure proper format
    const processedJobs = (jobs || []).map(job => ({
      ...job,
      start_date: job.start_date || null,
      end_date: job.end_date || null,
      status: job.status || 'Awaiting Order',
      tile_color: job.tile_color || '#3b82f6'
    }));

    // Get secondary workers if jobs were successfully fetched
    if (processedJobs.length > 0) {
      console.log(`Fetching secondary workers for ${processedJobs.length} jobs`);
      
      const { data: secondaryWorkers, error: secondaryError } = await supabase
        .from('job_secondary_workers')
        .select('*');

      if (secondaryError) {
        console.error('Error fetching secondary workers:', secondaryError);
        // Continue with empty secondary workers
      }

      const jobsWithSecondaryWorkers = processedJobs.map(job => ({
        ...job,
        secondary_worker_ids: (secondaryWorkers || [])
          .filter(sw => sw.job_id === job.id)
          .map(sw => sw.worker_id)
      }));

      console.log(`Successfully loaded ${jobsWithSecondaryWorkers.length} jobs`);
      return jobsWithSecondaryWorkers;
    }
    
    return processedJobs;
  } catch (error) {
    console.error('Critical error in getJobs:', error);
    throw error;
  }
};

// Rest of functions with better error handling

export const createJob = async (job: Omit<Database['public']['Tables']['jobs']['Insert'], 'id' | 'created_at'>) => {
  try {
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

    // Handle secondary workers if needed
    if (secondary_worker_ids?.length) {
      const secondaryWorkerData = secondary_worker_ids.map(worker_id => ({
        job_id: newJob.id,
        worker_id
      }));

      const { error: secondaryError } = await supabase
        .from('job_secondary_workers')
        .insert(secondaryWorkerData);

      if (secondaryError) {
        console.error('Error adding secondary workers:', secondaryError);
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

    // Handle secondary workers if present in updates
    if (secondary_worker_ids !== undefined) {
      // Delete existing secondary workers
      await supabase
        .from('job_secondary_workers')
        .delete()
        .eq('job_id', id);

      // Add new secondary workers if any
      if (secondary_worker_ids?.length) {
        const secondaryWorkerData = secondary_worker_ids.map(worker_id => ({
          job_id: id,
          worker_id
        }));

        await supabase
          .from('job_secondary_workers')
          .insert(secondaryWorkerData);
      }
    }

    // Get final secondary workers
    const { data: currentSecondaryWorkers } = await supabase
      .from('job_secondary_workers')
      .select('worker_id')
      .eq('job_id', id);

    return {
      ...updatedJob,
      secondary_worker_ids: (currentSecondaryWorkers || []).map(sw => sw.worker_id)
    };
  } catch (error) {
    console.error('Error in updateJob:', error);
    throw error;
  }
};

export const deleteJob = async (id: string) => {
  try {
    const { error } = await supabase
      .from('jobs')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting job:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in deleteJob:', error);
    throw error;
  }
};

export const createWorker = async (worker: Omit<Database['public']['Tables']['workers']['Insert'], 'id' | 'created_at'>) => {
  try {
    // Make sure role is set to admin
    const workerData = {
      ...worker,
      role: 'admin'
    };
    
    const { data, error } = await supabase
      .from('workers')
      .insert([workerData])
      .select()
      .single();

    if (error) {
      console.error('Error creating worker:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in createWorker:', error);
    throw error;
  }
};

export const getWorkerJobs = async (workerId: string) => {
  try {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('worker_id', workerId);

    if (error) {
      console.error('Error fetching worker jobs:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in getWorkerJobs:', error);
    throw error;
  }
};

export const deleteWorker = async (id: string) => {
  try {
    // First update any jobs assigned to this worker
    await supabase
      .from('jobs')
      .update({ worker_id: null })
      .eq('worker_id', id);
    
    // Delete secondary worker assignments
    await supabase
      .from('job_secondary_workers')
      .delete()
      .eq('worker_id', id);
    
    // Finally delete the worker
    const { error } = await supabase
      .from('workers')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error in deleteWorker:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteWorker:', error);
    throw error;
  }
};

// These functions are stubs since we don't need worker profile fetching during auth
export const getCurrentWorker = async (email: string) => {
  console.error('getCurrentWorker should not be called during authentication');
  return null;
};

export const createWorkerProfile = async (email: string, name?: string) => {
  console.error('createWorkerProfile should not be called during authentication');
  return null;
};

export const ensureUserRecord = async (authUserId: string, email: string, name?: string) => {
  console.error('ensureUserRecord should not be called during authentication');
  return null;
};