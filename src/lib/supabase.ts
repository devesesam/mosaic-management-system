import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';

// Create Supabase client with error handling
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

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

export const isSupabaseInitialized = () => {
  return Boolean(supabaseUrl && supabaseAnonKey);
};

// EXTREMELY DIRECT DATA ACCESS

// Get all workers with GUARANTEED access
export const getWorkers = async () => {
  try {
    console.log('DIRECT ACCESS: Getting all workers, URL:', supabaseUrl);
    
    // Try using the direct function first
    let { data, error } = await supabase.rpc('public_get_all_workers');
    
    if (error || !data || data.length === 0) {
      console.log('Using fallback direct table access for workers:', error);
      // Fall back to direct table access
      ({ data, error } = await supabase.from('workers').select('*'));
    }
    
    if (error) {
      console.error('ERROR ACCESSING WORKERS:', error);
      // Return empty array as fallback
      return [];
    }
    
    console.log('SUCCESSFULLY LOADED WORKERS:', data?.length || 0);
    return data || [];
  } catch (error) {
    console.error('CRITICAL ERROR IN getWorkers:', error);
    return [];
  }
};

// Get all jobs with GUARANTEED access
export const getJobs = async () => {
  try {
    console.log('DIRECT ACCESS: Getting all jobs, URL:', supabaseUrl);
    
    // Try using the direct function first
    let { data: jobs, error: jobsError } = await supabase.rpc('public_get_all_jobs');
    
    if (jobsError || !jobs || jobs.length === 0) {
      console.log('Using fallback direct table access for jobs:', jobsError);
      // Fall back to direct table access
      ({ data: jobs, error: jobsError } = await supabase.from('jobs').select('*'));
    }
    
    if (jobsError) {
      console.error('ERROR ACCESSING JOBS:', jobsError);
      return [];
    }

    // Get secondary workers if jobs were successfully fetched
    if (jobs && jobs.length > 0) {
      console.log('Getting secondary workers for', jobs.length, 'jobs');
      const { data: secondaryWorkers, error: secondaryError } = await supabase
        .from('job_secondary_workers')
        .select('*');

      if (secondaryError) {
        console.error('Error fetching secondary workers:', secondaryError);
        // Continue with empty secondary workers
      }

      console.log('Loaded', secondaryWorkers?.length || 0, 'secondary worker assignments');

      const jobsWithSecondaryWorkers = jobs.map(job => ({
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
    return [];
  }
};

// Rest of functions - simplified for clarity

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

export const ensureUserRecord = async (authUserId: string, email: string, name?: string) => {
  try {
    // First check if the user already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUserId)
      .single();
    
    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "Row not found"
      console.error('Error checking if user exists:', checkError);
    }
    
    if (existingUser) {
      console.log('User record already exists');
      return existingUser;
    }
    
    // If not, create the user record
    console.log('Creating new user record with ID:', authUserId);
    const { data, error } = await supabase
      .from('users')
      .insert([{
        id: authUserId,
        name: name || email.split('@')[0],
        email: email,
        role: 'admin'
      }])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating user record:', error);
      throw error;
    }
    
    console.log('User record created successfully');
    return data;
  } catch (error) {
    console.error('Error in ensureUserRecord:', error);
    throw error;
  }
};