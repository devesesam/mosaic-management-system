import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';

// Initialize with environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Helper function to check if Supabase is properly initialized
export const isSupabaseInitialized = () => {
  return Boolean(supabaseUrl && supabaseAnonKey);
};

export const getWorkers = async () => {
  try {
    // Simple query with minimal error handling
    const { data, error } = await supabase
      .from('workers')
      .select('*')
      .order('name');
    
    if (error) {
      console.error('Error fetching workers:', error);
      throw error;
    }
    
    console.log(`Retrieved ${data?.length || 0} workers`);
    return data || [];
  } catch (error) {
    console.error('Error in getWorkers:', error);
    throw error;
  }
};

export const createWorker = async (worker: Omit<Database['public']['Tables']['workers']['Insert'], 'id' | 'created_at'>) => {
  try {
    const { data, error } = await supabase
      .from('workers')
      .insert([worker])
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
    // Using the function we created in the migration
    const { error } = await supabase.rpc('delete_worker_with_jobs', {
      worker_id: id
    });

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
    const { data, error } = await supabase
      .from('workers')
      .select('*')
      .eq('email', email)
      .maybeSingle();
    
    if (error) {
      console.error('Error fetching current worker:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error in getCurrentWorker:', error);
    throw error;
  }
};

export const getJobs = async () => {
  try {
    // Direct query with no complex filtering
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select('*');
    
    if (jobsError) {
      console.error('Error fetching jobs:', jobsError);
      throw jobsError;
    }
    
    console.log(`Retrieved ${jobs?.length || 0} jobs`);
    
    // Get secondary worker assignments for each job
    const { data: secondaryWorkers, error: secondaryError } = await supabase
      .from('job_secondary_workers')
      .select('*');

    if (secondaryError) {
      console.error('Error fetching secondary workers:', secondaryError);
      throw secondaryError;
    }

    console.log(`Retrieved ${secondaryWorkers?.length || 0} secondary worker assignments`);

    // Combine jobs with their secondary workers
    const jobsWithSecondaryWorkers = jobs.map(job => ({
      ...job,
      secondary_worker_ids: secondaryWorkers
        ? secondaryWorkers
            .filter(sw => sw.job_id === job.id)
            .map(sw => sw.worker_id)
        : []
    }));
    
    return jobsWithSecondaryWorkers || [];
  } catch (error) {
    console.error('Error in getJobs:', error);
    throw error;
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
    
    if (jobError) {
      console.error('Error creating job:', jobError);
      throw jobError;
    }
    
    console.log('Job created successfully:', newJob);
    
    if (secondary_worker_ids?.length) {
      const secondaryWorkerData = secondary_worker_ids.map(worker_id => ({
        job_id: newJob.id,
        worker_id
      }));

      console.log('Adding secondary workers:', secondaryWorkerData);
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
    console.log('Updating job:', { id, updates });
    
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

    console.log('Job updated successfully:', updatedJob);

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

        console.log('Adding new secondary workers:', secondaryWorkerData);
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
    console.log('Deleting job:', id);
    const { error } = await supabase
      .from('jobs')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting job:', error);
      throw error;
    }
    
    console.log('Job deleted successfully');
  } catch (error) {
    console.error('Error in deleteJob:', error);
    throw error;
  }
};

// Function to directly create a worker profile for a new user
export const createWorkerProfile = async (email: string, name?: string) => {
  try {
    console.log('Creating worker profile for:', email);
    
    // Use a transaction to ensure either the worker is found or created
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
    
    console.log('Worker profile created:', data);
    return data;
  } catch (error) {
    console.error('Error creating worker profile:', error);
    throw error;
  }
};

// Function to ensure a record exists in public.users table
export const ensureUserRecord = async (authUserId: string, email: string, name?: string) => {
  try {
    console.log('Ensuring user record for:', email);
    
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
      console.log('User record already exists');
      return existingUser;
    }
    
    // If not, create the user record
    console.log('Creating new user record');
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

// Function to run diagnostics on the database
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
    }
    
    // Check auth user
    const { data: { user } } = await supabase.auth.getUser();
    console.log('Current auth user:', user ? 'Authenticated as ' + user.email : 'Not authenticated');
    
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

// Check RLS Policies
export const checkRLSPolicies = async () => {
  try {
    console.log('Checking RLS policies...');
    
    // Try to read from workers table
    const { data: workers, error: workersError } = await supabase
      .from('workers')
      .select('*')
      .limit(5);
    
    if (workersError) {
      console.error('Error reading workers:', workersError);
    } else {
      console.log(`Successfully read ${workers.length} workers`);
    }
    
    // Try to read from jobs table
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select('*')
      .limit(5);
    
    if (jobsError) {
      console.error('Error reading jobs:', jobsError);
    } else {
      console.log(`Successfully read ${jobs.length} jobs`);
    }
    
    // Try to read secondary workers
    const { data: secondaryWorkers, error: swError } = await supabase
      .from('job_secondary_workers')
      .select('*')
      .limit(5);
    
    if (swError) {
      console.error('Error reading job_secondary_workers:', swError);
    } else {
      console.log(`Successfully read ${secondaryWorkers.length} secondary worker assignments`);
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