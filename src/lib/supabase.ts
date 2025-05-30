import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';

// Create Supabase client with better error handling and diagnostics
let supabaseUrl = '';
let supabaseAnonKey = '';

try {
  supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase credentials');
  }
  
  console.log('Supabase URL is configured:', !!supabaseUrl);
} catch (error) {
  console.error('Error loading Supabase credentials:', error);
}

// Create the client with improved configuration
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'tasman-roofing-auth-storage',
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 2,
    },
  },
  global: {
    headers: {
      'X-Client-Info': 'tasman-roofing-scheduler',
    },
  },
});

// Connection status verification
export const verifySupabaseConnection = async () => {
  console.log('Verifying Supabase connection...');
  try {
    // Simple ping to verify we can connect
    const { data, error } = await supabase.from('workers').select('count', { count: 'exact', head: true });
    
    if (error) {
      console.error('Supabase connection error:', error);
      return { connected: false, error };
    }
    
    console.log('Supabase connection successful');
    return { connected: true };
  } catch (error) {
    console.error('Supabase connection check failed:', error);
    return { connected: false, error };
  }
};

export const isSupabaseInitialized = () => {
  return Boolean(supabaseUrl && supabaseAnonKey);
};

// Check auth status with better error handling
export const checkAuthStatus = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      console.error('Auth check failed:', error);
      return null;
    }
    return session;
  } catch (error) {
    console.error('Unexpected error checking auth status:', error);
    return null;
  }
};

// DIRECT TABLE ACCESS FUNCTIONS

// Get all workers with better error handling and logging
export const getWorkers = async () => {
  try {
    console.log('getWorkers: Fetching workers from Supabase');
    
    // Check connection first
    const connectionStatus = await verifySupabaseConnection();
    if (!connectionStatus.connected) {
      throw new Error(`Supabase connection check failed: ${connectionStatus.error?.message}`);
    }
    
    const { data, error, status } = await supabase
      .from('workers')
      .select('*')
      .order('name');
    
    console.log('getWorkers: Response status:', status);
    
    if (error) {
      console.error('getWorkers: Error fetching workers:', error);
      throw new Error(`Failed to fetch workers: ${error.message}`);
    }
    
    console.log(`getWorkers: Successfully loaded ${data?.length || 0} workers`);
    return data || [];
  } catch (error) {
    console.error('getWorkers: Critical error:', error);
    throw error;
  }
};

// Get all jobs with better error handling and logging
export const getJobs = async () => {
  try {
    console.log('getJobs: Fetching jobs from Supabase');
    
    // Check connection first
    const connectionStatus = await verifySupabaseConnection();
    if (!connectionStatus.connected) {
      throw new Error(`Supabase connection check failed: ${connectionStatus.error?.message}`);
    }
    
    const { data: jobs, error: jobsError, status } = await supabase
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false });
    
    console.log('getJobs: Response status:', status);
    
    if (jobsError) {
      console.error('getJobs: Error fetching jobs:', jobsError);
      throw new Error(`Failed to fetch jobs: ${jobsError.message}`);
    }

    // Process jobs data
    const processedJobs = (jobs || []).map(job => ({
      ...job,
      start_date: job.start_date || null,
      end_date: job.end_date || null,
      status: job.status || 'Awaiting Order',
      tile_color: job.tile_color || '#3b82f6'
    }));

    console.log(`getJobs: Successfully loaded ${processedJobs.length} jobs`);

    // Get secondary workers only if we have jobs
    if (processedJobs.length > 0) {
      console.log('getJobs: Fetching secondary workers');
      
      const { data: secondaryWorkers, error: secondaryError } = await supabase
        .from('job_secondary_workers')
        .select('*');

      if (secondaryError) {
        console.error('getJobs: Error fetching secondary workers:', secondaryError);
        // Continue with empty secondary workers
      } else {
        console.log(`getJobs: Loaded ${secondaryWorkers?.length || 0} secondary worker assignments`);
      }

      return processedJobs.map(job => ({
        ...job,
        secondary_worker_ids: (secondaryWorkers || [])
          .filter(sw => sw.job_id === job.id)
          .map(sw => sw.worker_id)
      }));
    }
    
    return processedJobs;
  } catch (error) {
    console.error('getJobs: Critical error:', error);
    throw error;
  }
};

// Rest of functions with better error handling

export const createJob = async (job: Omit<Database['public']['Tables']['jobs']['Insert'], 'id' | 'created_at'>) => {
  try {
    console.log('createJob: Creating new job');
    const { secondary_worker_ids, ...jobData } = job as any;
    
    // Check connection first
    const connectionStatus = await verifySupabaseConnection();
    if (!connectionStatus.connected) {
      throw new Error(`Supabase connection check failed: ${connectionStatus.error?.message}`);
    }
    
    const { data: newJob, error: jobError } = await supabase
      .from('jobs')
      .insert([jobData])
      .select()
      .single();
    
    if (jobError) {
      console.error('createJob: Error creating job:', jobError);
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
        console.error('createJob: Error adding secondary workers:', secondaryError);
      }
    }
    
    return {
      ...newJob,
      secondary_worker_ids: secondary_worker_ids || []
    };
  } catch (error) {
    console.error('createJob: Critical error:', error);
    throw error;
  }
};

export const updateJob = async (id: string, updates: Partial<Database['public']['Tables']['jobs']['Update']>) => {
  try {
    console.log('updateJob: Updating job:', id);
    
    // Check connection first
    const connectionStatus = await verifySupabaseConnection();
    if (!connectionStatus.connected) {
      throw new Error(`Supabase connection check failed: ${connectionStatus.error?.message}`);
    }
    
    const { secondary_worker_ids, ...jobUpdates } = updates as any;
    
    const { data: updatedJob, error: jobError } = await supabase
      .from('jobs')
      .update(jobUpdates)
      .eq('id', id)
      .select()
      .single();
    
    if (jobError) {
      console.error('updateJob: Error updating job:', jobError);
      throw jobError;
    }

    // Handle secondary workers if present in updates
    if (secondary_worker_ids !== undefined) {
      // Delete existing secondary workers
      const { error: deleteError } = await supabase
        .from('job_secondary_workers')
        .delete()
        .eq('job_id', id);
        
      if (deleteError) {
        console.error('updateJob: Error deleting secondary workers:', deleteError);
      }

      // Add new secondary workers if any
      if (secondary_worker_ids?.length) {
        const secondaryWorkerData = secondary_worker_ids.map(worker_id => ({
          job_id: id,
          worker_id
        }));

        const { error: insertError } = await supabase
          .from('job_secondary_workers')
          .insert(secondaryWorkerData);
          
        if (insertError) {
          console.error('updateJob: Error adding new secondary workers:', insertError);
        }
      }
    }

    // Get final secondary workers
    const { data: currentSecondaryWorkers, error: getError } = await supabase
      .from('job_secondary_workers')
      .select('worker_id')
      .eq('job_id', id);
      
    if (getError) {
      console.error('updateJob: Error fetching final secondary workers:', getError);
    }

    return {
      ...updatedJob,
      secondary_worker_ids: (currentSecondaryWorkers || []).map(sw => sw.worker_id)
    };
  } catch (error) {
    console.error('updateJob: Critical error:', error);
    throw error;
  }
};

export const deleteJob = async (id: string) => {
  try {
    console.log('deleteJob: Deleting job:', id);
    
    // Check connection first
    const connectionStatus = await verifySupabaseConnection();
    if (!connectionStatus.connected) {
      throw new Error(`Supabase connection check failed: ${connectionStatus.error?.message}`);
    }
    
    const { error } = await supabase
      .from('jobs')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('deleteJob: Error deleting job:', error);
      throw error;
    }
  } catch (error) {
    console.error('deleteJob: Critical error:', error);
    throw error;
  }
};

export const createWorker = async (worker: Omit<Database['public']['Tables']['workers']['Insert'], 'id' | 'created_at'>) => {
  try {
    console.log('createWorker: Creating worker');
    
    // Check connection first
    const connectionStatus = await verifySupabaseConnection();
    if (!connectionStatus.connected) {
      throw new Error(`Supabase connection check failed: ${connectionStatus.error?.message}`);
    }
    
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
      console.error('createWorker: Error creating worker:', error);
      throw error;
    }

    console.log('createWorker: Worker created successfully');
    return data;
  } catch (error) {
    console.error('createWorker: Critical error:', error);
    throw error;
  }
};

export const getWorkerJobs = async (workerId: string) => {
  try {
    console.log('getWorkerJobs: Fetching jobs for worker:', workerId);
    
    // Check connection first
    const connectionStatus = await verifySupabaseConnection();
    if (!connectionStatus.connected) {
      throw new Error(`Supabase connection check failed: ${connectionStatus.error?.message}`);
    }
    
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('worker_id', workerId);

    if (error) {
      console.error('getWorkerJobs: Error fetching worker jobs:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('getWorkerJobs: Critical error:', error);
    throw error;
  }
};

export const deleteWorker = async (id: string) => {
  try {
    console.log('deleteWorker: Deleting worker:', id);
    
    // Check connection first
    const connectionStatus = await verifySupabaseConnection();
    if (!connectionStatus.connected) {
      throw new Error(`Supabase connection check failed: ${connectionStatus.error?.message}`);
    }
    
    // First update any jobs assigned to this worker
    const { error: updateError } = await supabase
      .from('jobs')
      .update({ worker_id: null })
      .eq('worker_id', id);
      
    if (updateError) {
      console.error('deleteWorker: Error updating jobs:', updateError);
    }
    
    // Delete secondary worker assignments
    const { error: deleteSecondaryError } = await supabase
      .from('job_secondary_workers')
      .delete()
      .eq('worker_id', id);
      
    if (deleteSecondaryError) {
      console.error('deleteWorker: Error deleting secondary assignments:', deleteSecondaryError);
    }
    
    // Finally delete the worker
    const { error } = await supabase
      .from('workers')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('deleteWorker: Error deleting worker:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('deleteWorker: Critical error:', error);
    throw error;
  }
};

export const getCurrentWorker = async (email: string) => {
  try {
    console.log('getCurrentWorker: Fetching worker for email:', email);
    
    // Check connection first
    const connectionStatus = await verifySupabaseConnection();
    if (!connectionStatus.connected) {
      console.warn(`Supabase connection check failed during getCurrentWorker: ${connectionStatus.error?.message}`);
      // Continue anyway as this is a critical path for login
    }
    
    const { data, error } = await supabase
      .from('workers')
      .select('*')
      .eq('email', email)
      .maybeSingle();
    
    if (error) {
      console.error('getCurrentWorker: Error fetching worker by email:', error);
      return null;
    }
    
    if (!data) {
      console.log('getCurrentWorker: No worker found, creating one');
      try {
        return await createWorkerProfile(email);
      } catch (createError) {
        console.error('getCurrentWorker: Failed to create worker:', createError);
        return null;
      }
    }
    
    return data;
  } catch (error) {
    console.error('getCurrentWorker: Critical error:', error);
    return null;
  }
};

export const createWorkerProfile = async (email: string, name?: string) => {
  try {
    console.log(`createWorkerProfile: Creating worker profile for ${email}`);
    
    // Check connection first
    const connectionStatus = await verifySupabaseConnection();
    if (!connectionStatus.connected) {
      console.warn(`Supabase connection check failed during createWorkerProfile: ${connectionStatus.error?.message}`);
      // Continue anyway as this is a critical path for login
    }
    
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
      console.error('createWorkerProfile: Failed to create worker profile:', error);
      throw error;
    }
    
    console.log('createWorkerProfile: Worker profile created/updated');
    return data;
  } catch (error) {
    console.error('createWorkerProfile: Critical error:', error);
    throw error;
  }
};

export const ensureUserRecord = async (authUserId: string, email: string, name?: string) => {
  try {
    console.log('ensureUserRecord: Ensuring user record exists for:', authUserId);
    
    // Check connection first
    const connectionStatus = await verifySupabaseConnection();
    if (!connectionStatus.connected) {
      console.warn(`Supabase connection check failed during ensureUserRecord: ${connectionStatus.error?.message}`);
      // Continue anyway as this is a critical path for login
    }
    
    // First check if the user already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUserId)
      .single();
    
    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "Row not found"
      console.error('ensureUserRecord: Error checking if user exists:', checkError);
    }
    
    if (existingUser) {
      console.log('ensureUserRecord: User record already exists');
      return existingUser;
    }
    
    // If not, create the user record
    console.log('ensureUserRecord: Creating new user record with ID:', authUserId);
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
      console.error('ensureUserRecord: Error creating user record:', error);
      throw error;
    }
    
    console.log('ensureUserRecord: User record created successfully');
    return data;
  } catch (error) {
    console.error('ensureUserRecord: Critical error:', error);
    throw error;
  }
};