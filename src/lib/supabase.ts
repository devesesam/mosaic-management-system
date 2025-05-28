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
    console.log('Using Supabase client with URL:', supabaseUrl);
    
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
      return [];
    }
    
    console.log('SUCCESSFULLY LOADED WORKERS:', data?.length || 0);
    console.log('Workers payload:', JSON.stringify(data, null, 2));
    return data || [];
  } catch (error) {
    console.error('CRITICAL ERROR IN getWorkers:', error);
    return [];
  }
};

// Get all jobs with full debugging
export const getJobs = async () => {
  try {
    console.log('DIRECT ACCESS: Getting all jobs');
    console.log('Using Supabase client with URL:', supabaseUrl);
    
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
      return [];
    }

    console.log('Jobs raw payload:', JSON.stringify(jobs, null, 2));

    // Get secondary workers if jobs were successfully fetched
    if (jobs && jobs.length > 0) {
      console.log('Getting secondary workers for', jobs.length, 'jobs');
      console.log('Executing: supabase.from("job_secondary_workers").select("*")');
      
      const { data: secondaryWorkers, error: secondaryError } = await supabase
        .from('job_secondary_workers')
        .select('*');

      if (secondaryError) {
        console.error('Error fetching secondary workers:', secondaryError);
        console.log('Secondary workers error payload:', JSON.stringify(secondaryError, null, 2));
        // Continue with empty secondary workers
      } else {
        console.log('Secondary workers payload:', JSON.stringify(secondaryWorkers, null, 2));
      }

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

// Add a function to directly check if tables exist
export const checkTablesExist = async () => {
  try {
    // Test direct query to the pg_tables system view
    const { data, error } = await supabase
      .rpc('check_tables_exist', { 
        table_names: ['workers', 'jobs', 'job_secondary_workers', 'users'] 
      });
    
    if (error) {
      console.error('Error checking if tables exist:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Error in checkTablesExist:', error);
    return null;
  }
};

// Test a simple insert and select to verify permissions
export const testTablePermissions = async () => {
  try {
    // Try inserting a test worker
    const testEmail = `test_${Date.now()}@example.com`;
    
    const { data: insertData, error: insertError } = await supabase
      .from('workers')
      .insert([{
        name: 'Test Worker',
        email: testEmail,
        role: 'admin'
      }])
      .select()
      .single();
    
    if (insertError) {
      return {
        success: false,
        operation: 'insert',
        error: insertError
      };
    }
    
    // If insert succeeded, try to delete the test worker
    const { error: deleteError } = await supabase
      .from('workers')
      .delete()
      .eq('id', insertData.id);
    
    if (deleteError) {
      return {
        success: false,
        operation: 'delete',
        error: deleteError
      };
    }
    
    return {
      success: true,
      operations: ['insert', 'delete'],
      testId: insertData.id
    };
  } catch (error) {
    console.error('Error in testTablePermissions:', error);
    return {
      success: false,
      operation: 'unknown',
      error
    };
  }
};