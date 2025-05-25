import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';

// Initialize with empty strings first
let supabaseUrl = '';
let supabaseAnonKey = '';

try {
  supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase credentials in environment variables');
  }
} catch (error) {
  console.error('Error loading Supabase credentials:', error);
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Helper function to check if Supabase is properly initialized
export const isSupabaseInitialized = () => {
  return Boolean(supabaseUrl && supabaseAnonKey);
};

export const getWorkers = async () => {
  try {
    if (!isSupabaseInitialized()) {
      throw new Error('Supabase is not properly initialized');
    }

    console.log('getWorkers: Fetching workers from Supabase');
    
    // Debug: Test the connection first
    try {
      const { data: testData, error: testError } = await supabase
        .from('workers')
        .select('count(*)', { count: 'exact', head: true });
        
      console.log(`getWorkers: Connection test complete, found ${testData?.count || 0} workers`);
      
      if (testError) {
        console.error('getWorkers: Connection test error:', testError);
        throw testError;
      }
    } catch (testError) {
      console.error('getWorkers: Connection test failed:', testError);
    }
    
    // Actual data fetch with no caching
    const { data, error, status } = await supabase
      .from('workers')
      .select('*')
      .order('name')
      .throwOnError();
    
    if (error) {
      console.error('Error fetching workers:', error);
      throw error;
    }
    
    if (!data || data.length === 0) {
      console.warn('getWorkers: No workers found in database!');
    } else {
      console.log(`getWorkers: Successfully retrieved ${data.length} workers (HTTP status: ${status})`);
      console.log('Sample worker:', data[0]);
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in getWorkers:', error);
    throw error;
  }
};

export const getJobs = async () => {
  try {
    if (!isSupabaseInitialized()) {
      throw new Error('Supabase is not properly initialized');
    }

    console.log('getJobs: Fetching all jobs');
    
    // Test connection first
    try {
      const { count, error: countError } = await supabase
        .from('jobs')
        .select('*', { count: 'exact', head: true });
        
      console.log(`getJobs: Connection test shows ${count} jobs available`);
      
      if (countError) {
        console.error('getJobs: Connection test error:', countError);
        throw countError;
      }
    } catch (testError) {
      console.error('getJobs: Connection test failed:', testError);
    }
    
    // Fetch jobs with no caching
    const { data: jobs, error: jobsError, status: jobsStatus } = await supabase
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .throwOnError();
    
    if (jobsError) {
      console.error('Error fetching jobs:', jobsError);
      throw jobsError;
    }

    console.log(`getJobs: Retrieved ${jobs?.length || 0} jobs (HTTP status: ${jobsStatus})`);
    
    // Get secondary worker assignments for each job
    const { data: secondaryWorkers, error: secondaryError } = await supabase
      .from('job_secondary_workers')
      .select('*')
      .throwOnError();

    if (secondaryError) {
      console.error('Error fetching secondary workers:', secondaryError);
      throw secondaryError;
    }

    console.log(`getJobs: Retrieved ${secondaryWorkers?.length || 0} secondary worker assignments`);

    // Combine jobs with their secondary workers
    const jobsWithSecondaryWorkers = jobs.map(job => ({
      ...job,
      secondary_worker_ids: secondaryWorkers
        ? secondaryWorkers
            .filter(sw => sw.job_id === job.id)
            .map(sw => sw.worker_id)
        : []
    }));
    
    // Log sample data
    if (jobsWithSecondaryWorkers.length > 0) {
      console.log('getJobs: Sample job data:', jobsWithSecondaryWorkers[0]);
    } else {
      console.warn('getJobs: No jobs found in database!');
    }
    
    return jobsWithSecondaryWorkers || [];
  } catch (error) {
    console.error('Error in getJobs:', error);
    throw error;
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

export const getCurrentWorker = async (email: string) => {
  try {
    if (!isSupabaseInitialized()) {
      throw new Error('Supabase is not properly initialized');
    }

    console.log('getCurrentWorker: Fetching worker for email:', email);
    
    // Verify connection to Supabase
    try {
      const { error: pingError } = await supabase.from('workers').select('count').limit(1);
      if (pingError) {
        console.error('getCurrentWorker: Failed to connect to Supabase:', pingError);
        throw new Error(`Supabase connection error: ${pingError.message}`);
      }
    } catch (pingError) {
      console.error('getCurrentWorker: Supabase ping failed:', pingError);
      throw new Error('Failed to connect to database');
    }
    
    // Try to get all workers first to see if we can access the table
    try {
      const { data: allWorkers, error: allError } = await supabase
        .from('workers')
        .select('*')
        .limit(5);
      
      if (allError) {
        console.error('getCurrentWorker: Failed to get any workers:', allError);
      } else {
        console.log(`getCurrentWorker: Successfully fetched ${allWorkers.length} workers as test`);
      }
    } catch (testError) {
      console.error('getCurrentWorker: Test fetch failed:', testError);
    }
    
    // Now try to get the specific worker by email
    const { data, error, status } = await supabase
      .from('workers')
      .select('*')
      .eq('email', email)
      .maybeSingle();
    
    if (error) {
      console.error('getCurrentWorker: Error fetching current worker:', error);
      throw error;
    }
    
    if (!data) {
      console.warn(`getCurrentWorker: No worker found for email: ${email}`);
      // If no worker found, try creating one
      try {
        const newWorker = await createWorkerProfile(email);
        console.log('getCurrentWorker: Created new worker:', newWorker);
        return newWorker;
      } catch (createError) {
        console.error('getCurrentWorker: Failed to create worker:', createError);
        throw createError;
      }
    }
    
    console.log(`getCurrentWorker: Worker data for email: ${email}`, data, `(HTTP status: ${status})`);
    
    return data;
  } catch (error) {
    console.error('getCurrentWorker: Error in getCurrentWorker:', error);
    throw error;
  }
};

export const createWorkerProfile = async (email: string, name?: string) => {
  try {
    console.log(`createWorkerProfile: Creating worker profile for ${email}...`);
    
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
    
    console.log('Worker profile created/updated:', data);
    return data;
  } catch (error) {
    console.error('Error creating worker profile:', error);
    throw error;
  }
};

export const ensureUserRecord = async (authUserId: string, email: string, name?: string) => {
  try {
    console.log(`ensureUserRecord: Ensuring user record for ${email}...`);
    
    // First check if the user already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUserId)
      .single();
    
    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "Row not found" which is expected
      console.error('Error checking if user exists:', checkError);
    }
    
    if (existingUser) {
      console.log('User record already exists:', existingUser);
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
    
    console.log('User record created successfully:', data);
    return data;
  } catch (error) {
    console.error('Error in ensureUserRecord:', error);
    throw error;
  }
};

export const runDatabaseDiagnostics = async (email: string) => {
  try {
    console.log('Running database diagnostics...');
    
    // Check workers
    const { data: workers, error: workersError } = await supabase
      .from('workers')
      .select('*');
    
    if (workersError) {
      console.error('Error fetching workers:', workersError);
    } else {
      console.log(`Workers table contains ${workers.length} records`);
      const userWorker = workers.find(w => w.email === email);
      console.log(`User worker record:`, userWorker || 'Not found');
    }
    
    // Check jobs
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select('*');
    
    if (jobsError) {
      console.error('Error fetching jobs:', jobsError);
    } else {
      console.log(`Jobs table contains ${jobs.length} records`);
    }
    
    // Check users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*');
    
    if (usersError) {
      console.error('Error fetching users:', usersError);
    } else {
      console.log(`Users table contains ${users.length} records`);
      const userRecord = users.find(u => u.email === email);
      console.log(`User record:`, userRecord || 'Not found');
    }
    
    // Check auth user
    const { data: { user } } = await supabase.auth.getUser();
    console.log('Current auth user:', user || 'Not authenticated');
    
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