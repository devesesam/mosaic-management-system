import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';

// Create Supabase client with better error handling and debugging
let supabaseUrl = '';
let supabaseAnonKey = '';

try {
  supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase credentials');
  }
  
  console.log('Supabase initialization with URL:', supabaseUrl);
} catch (error) {
  console.error('Error loading Supabase credentials:', error);
}

// Create the client
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  },
  global: {
    headers: {
      'X-Client-Info': 'tasman-roofing-scheduler'
    }
  },
  db: {
    schema: 'public'
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

// Get all workers with full debugging
export const getWorkers = async () => {
  try {
    console.log('DIRECT ACCESS: Getting all workers');
    
    // Try direct table access with detailed logging
    console.log('Executing: supabase.from("workers").select("*")');
    const { data, error, status, statusText } = await supabase
      .from('workers')
      .select('*')
      .order('name');
    
    console.log('Response status:', status, statusText);
    
    if (error) {
      console.error('ERROR ACCESSING WORKERS:', error);
      console.log('Full error payload:', JSON.stringify(error, null, 2));
      throw new Error(`Failed to fetch workers: ${error.message}`);
    }
    
    console.log('SUCCESSFULLY LOADED WORKERS:', data?.length || 0);
    if (data && data.length > 0) {
      console.log('First worker sample:', JSON.stringify(data[0], null, 2));
    }
    return data || [];
  } catch (error) {
    console.error('CRITICAL ERROR IN getWorkers:', error);
    throw error;
  }
};

// Get all jobs with full debugging
export const getJobs = async () => {
  try {
    console.log('DIRECT ACCESS: Getting all jobs');
    
    // Try direct table access with detailed logging
    console.log('Executing: supabase.from("jobs").select("*")');
    const { data: jobs, error: jobsError, status, statusText } = await supabase
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false });
    
    console.log('Response status:', status, statusText);
    
    if (jobsError) {
      console.error('ERROR ACCESSING JOBS:', jobsError);
      console.log('Full error payload:', JSON.stringify(jobsError, null, 2));
      throw new Error(`Failed to fetch jobs: ${jobsError.message}`);
    }

    // Ensure correct date formatting and defaults for calendar display
    const processedJobs = (jobs || []).map(job => ({
      ...job,
      // Ensure dates are in ISO format with timezone if they exist
      start_date: job.start_date || null,
      end_date: job.end_date || null,
      // Default status if missing
      status: job.status || 'Awaiting Order',
      // Default color if missing
      tile_color: job.tile_color || '#3b82f6'
    }));

    // Get secondary workers if jobs were successfully fetched
    if (processedJobs.length > 0) {
      console.log('Getting secondary workers for', processedJobs.length, 'jobs');
      
      const { data: secondaryWorkers, error: secondaryError } = await supabase
        .from('job_secondary_workers')
        .select('*');

      if (secondaryError) {
        console.error('Error fetching secondary workers:', secondaryError);
        // Continue with empty secondary workers
      } else {
        console.log('Loaded', secondaryWorkers?.length || 0, 'secondary worker assignments');
      }

      const jobsWithSecondaryWorkers = processedJobs.map(job => ({
        ...job,
        secondary_worker_ids: (secondaryWorkers || [])
          .filter(sw => sw.job_id === job.id)
          .map(sw => sw.worker_id)
      }));

      console.log('SUCCESSFULLY LOADED JOBS:', jobsWithSecondaryWorkers.length);
      return jobsWithSecondaryWorkers;
    }
    
    console.log('No jobs found in database');
    return [];
  } catch (error) {
    console.error('CRITICAL ERROR IN getJobs:', error);
    throw error;
  }
};

// Rest of functions with better error handling

export const createJob = async (job: Omit<Database['public']['Tables']['jobs']['Insert'], 'id' | 'created_at'>) => {
  try {
    console.log('createJob: Creating new job');
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
    console.log('updateJob: Updating job:', id);
    
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
    console.log('deleteJob: Deleting job:', id);
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
    console.log('createWorker: Creating worker');
    
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

    console.log('createWorker: Worker created successfully');
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
    console.log('deleteWorker: Deleting worker:', id);
    
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

export const getCurrentWorker = async (email: string) => {
  try {
    console.log('getCurrentWorker: Fetching worker for email:', email);
    
    const { data, error } = await supabase
      .from('workers')
      .select('*')
      .eq('email', email)
      .maybeSingle();
    
    if (error) {
      console.error('Error fetching worker by email:', error);
      return null;
    }
    
    if (!data) {
      console.log('No worker found, creating one');
      try {
        return await createWorkerProfile(email);
      } catch (createError) {
        console.error('Failed to create worker:', createError);
        return null;
      }
    }
    
    return data;
  } catch (error) {
    console.error('Error in getCurrentWorker:', error);
    return null;
  }
};

export const createWorkerProfile = async (email: string, name?: string) => {
  try {
    console.log(`Creating worker profile for ${email}`);
    
    const { data, error } = await supabase
      .from('workers')
      .upsert(
        {
          name: name || email.split('@')[0],
          email: email,
          role: 'admin'
        },
        { 
          onConflict: 'email',
          ignoreDuplicates: false
        }
      )
      .select()
      .single();
      
    if (error) {
      console.error('Failed to create worker profile:', error);
      throw error;
    }
    
    console.log('Worker profile created/updated');
    return data;
  } catch (error) {
    console.error('Error creating worker profile:', error);
    throw error;
  }
};