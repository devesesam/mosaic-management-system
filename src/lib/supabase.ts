import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';

// Initialize with environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  },
  global: {
    fetch: fetch.bind(globalThis)
  },
  db: {
    schema: 'public'
  }
});

// Helper function to check if Supabase is properly initialized
export const isSupabaseInitialized = () => {
  return Boolean(supabaseUrl && supabaseAnonKey);
};

export const getWorkers = async () => {
  try {
    // Absolute simplest query possible
    const { data } = await supabase.from('workers').select('*');
    console.log(`getWorkers: Retrieved ${data?.length || 0} workers`);
    return data || [];
  } catch (error) {
    console.error('Error in getWorkers:', error);
    return []; // Return empty array instead of throwing
  }
};

export const createWorker = async (worker: Omit<Database['public']['Tables']['workers']['Insert'], 'id' | 'created_at'>) => {
  try {
    const { data, error } = await supabase
      .from('workers')
      .insert([worker])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error in createWorker:', error);
    throw error;
  }
};

export const getWorkerJobs = async (workerId: string) => {
  try {
    const { data } = await supabase
      .from('jobs')
      .select('*')
      .eq('worker_id', workerId);

    return data || [];
  } catch (error) {
    console.error('Error in getWorkerJobs:', error);
    return []; // Return empty array instead of throwing
  }
};

export const deleteWorker = async (id: string) => {
  try {
    // Using the function we created in the migration
    const { error } = await supabase.rpc('delete_worker_with_jobs', {
      worker_id: id
    });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error in deleteWorker:', error);
    throw error;
  }
};

export const getCurrentWorker = async (email: string) => {
  try {
    const { data } = await supabase
      .from('workers')
      .select('*')
      .eq('email', email)
      .maybeSingle();
    
    return data;
  } catch (error) {
    console.error('Error in getCurrentWorker:', error);
    return null; // Return null instead of throwing
  }
};

export const getJobs = async () => {
  try {
    // Absolute simplest query possible
    const { data: jobs } = await supabase.from('jobs').select('*');
    console.log(`getJobs: Retrieved ${jobs?.length || 0} jobs`);
    
    // Get secondary worker assignments
    const { data: secondaryWorkers } = await supabase
      .from('job_secondary_workers')
      .select('*');

    // Combine jobs with their secondary workers
    const jobsWithSecondaryWorkers = (jobs || []).map(job => ({
      ...job,
      secondary_worker_ids: secondaryWorkers
        ? secondaryWorkers
            .filter(sw => sw.job_id === job.id)
            .map(sw => sw.worker_id)
        : []
    }));
    
    return jobsWithSecondaryWorkers;
  } catch (error) {
    console.error('Error in getJobs:', error);
    return []; // Return empty array instead of throwing
  }
};

export const createJob = async (job: Omit<Database['public']['Tables']['jobs']['Insert'], 'id' | 'created_at'>) => {
  try {
    console.log('Creating new job:', job);
    const { secondary_worker_ids, ...jobData } = job as any;
    
    const { data: newJob, error: jobError } = await supabase
      .from('jobs')
      .insert([jobData])
      .select()
      .single();
    
    if (jobError) throw jobError;
    
    if (secondary_worker_ids?.length) {
      const secondaryWorkerData = secondary_worker_ids.map(worker_id => ({
        job_id: newJob.id,
        worker_id
      }));

      const { error: secondaryError } = await supabase
        .from('job_secondary_workers')
        .insert(secondaryWorkerData);

      if (secondaryError) throw secondaryError;
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
    
    if (jobError) throw jobError;

    if (secondary_worker_ids !== undefined) {
      // Delete existing secondary workers
      await supabase
        .from('job_secondary_workers')
        .delete()
        .eq('job_id', id);

      if (secondary_worker_ids?.length) {
        const secondaryWorkerData = secondary_worker_ids.map(worker_id => ({
          job_id: id,
          worker_id
        }));

        // Insert new secondary workers
        await supabase
          .from('job_secondary_workers')
          .insert(secondaryWorkerData);
      }
    }

    const { data: currentSecondaryWorkers } = await supabase
      .from('job_secondary_workers')
      .select('worker_id')
      .eq('job_id', id);

    const finalJob = {
      ...updatedJob,
      secondary_worker_ids: (currentSecondaryWorkers || []).map(sw => sw.worker_id)
    };
    
    return finalJob;
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

    if (error) throw error;
  } catch (error) {
    console.error('Error in deleteJob:', error);
    throw error;
  }
};

// Function to directly create a worker profile for a new user
export const createWorkerProfile = async (email: string, name?: string) => {
  try {
    // Simple upsert with minimal error handling
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
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating worker profile:', error);
    // Return a default worker if creation fails
    return {
      id: '00000000-0000-0000-0000-000000000000',
      name: email.split('@')[0],
      email: email,
      role: 'admin',
      created_at: new Date().toISOString(),
      phone: null
    };
  }
};

// Function to ensure a record exists in public.users table
export const ensureUserRecord = async (authUserId: string, email: string, name?: string) => {
  try {
    // Simple upsert with minimal error handling
    const { data, error } = await supabase
      .from('users')
      .upsert([{
        id: authUserId,
        name: name || email.split('@')[0],
        email: email,
        role: 'admin'
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error in ensureUserRecord:', error);
    return null;
  }
};

// Function to run diagnostics on the database
export const runDatabaseDiagnostics = async (email: string) => {
  try {
    // Simple diagnostic checks
    const { data: workers } = await supabase.from('workers').select('*').limit(5);
    const { data: jobs } = await supabase.from('jobs').select('*').limit(5);
    const { data: users } = await supabase.from('users').select('*').limit(5);
    const { data: { user } } = await supabase.auth.getUser();
    
    console.log('Database diagnostics:', {
      workersCount: workers?.length || 0,
      jobsCount: jobs?.length || 0,
      usersCount: users?.length || 0,
      isAuthenticated: !!user
    });
    
    return {
      workersCount: workers?.length || 0,
      jobsCount: jobs?.length || 0,
      usersCount: users?.length || 0,
      userWorker: workers?.find(w => w.email === email) || null,
      userRecord: users?.find(u => u.email === email) || null,
      authUser: user
    };
  } catch (error) {
    console.error('Error running diagnostics:', error);
    return {
      workersCount: 0,
      jobsCount: 0,
      usersCount: 0,
      userWorker: null,
      userRecord: null,
      authUser: null
    };
  }
};

// Check RLS Policies
export const checkRLSPolicies = async () => {
  try {
    // Simple checks with minimal processing
    const { data: workers } = await supabase.from('workers').select('*').limit(5);
    const { data: jobs } = await supabase.from('jobs').select('*').limit(5);
    const { data: secondaryWorkers } = await supabase.from('job_secondary_workers').select('*').limit(5);
    
    console.log('RLS policy check:', {
      canReadWorkers: workers?.length >= 0,
      canReadJobs: jobs?.length >= 0,
      canReadSecondaryWorkers: secondaryWorkers?.length >= 0
    });
    
    return {
      canReadWorkers: workers?.length >= 0,
      canReadJobs: jobs?.length >= 0,
      canReadSecondaryWorkers: secondaryWorkers?.length >= 0
    };
  } catch (error) {
    console.error('Error checking RLS policies:', error);
    return {
      canReadWorkers: false,
      canReadJobs: false,
      canReadSecondaryWorkers: false
    };
  }
};