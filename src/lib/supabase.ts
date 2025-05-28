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

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

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

export const getWorkers = async () => {
  try {
    console.log('getWorkers: Starting fetch...');
    
    // Direct query without filters or RLS dependencies
    const { data, error } = await supabase
      .from('workers')
      .select('*')
      .order('name');

    if (error) {
      console.error('getWorkers: Query failed:', error);
      return [];
    }

    console.log('getWorkers: Success', {
      count: data?.length || 0,
      first_worker: data?.length > 0 ? data[0].name : 'No workers found'
    });

    return data || [];
  } catch (error) {
    console.error('getWorkers: Failed:', error);
    // Return empty array instead of throwing to prevent UI errors
    return [];
  }
};

export const getJobs = async () => {
  try {
    console.log('getJobs: Starting fetch...');
    
    // Direct query for all jobs
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false });

    if (jobsError) {
      console.error('getJobs: Jobs query failed:', jobsError);
      return [];
    }

    console.log(`getJobs: Successfully fetched ${jobs?.length || 0} jobs`);

    // Safe query for secondary workers
    const { data: secondaryWorkers, error: secondaryError } = await supabase
      .from('job_secondary_workers')
      .select('*');

    if (secondaryError) {
      console.error('getJobs: Secondary workers query failed:', secondaryError);
      // Continue anyway, just won't have secondary workers
    }

    // Guard against null jobs
    if (!jobs) {
      console.warn('getJobs: No jobs found or null response');
      return [];
    }

    const jobsWithSecondaryWorkers = jobs.map(job => ({
      ...job,
      secondary_worker_ids: (secondaryWorkers || [])
        .filter(sw => sw.job_id === job.id)
        .map(sw => sw.worker_id)
    }));

    console.log('getJobs: Returning combined data:', {
      total_jobs: jobsWithSecondaryWorkers.length,
      first_job: jobsWithSecondaryWorkers.length > 0 ? jobsWithSecondaryWorkers[0].address : 'No jobs found'
    });

    return jobsWithSecondaryWorkers;
  } catch (error) {
    console.error('getJobs: Failed:', error);
    // Return empty array instead of throwing to prevent UI errors
    return [];
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
    
    const { data, error } = await supabase
      .from('workers')
      .select('*')
      .eq('email', email)
      .maybeSingle();
    
    if (error) {
      console.error('getCurrentWorker: Error fetching current worker:', error);
      return null;
    }
    
    if (!data) {
      console.warn(`getCurrentWorker: No worker found for email: ${email}`);
      try {
        const newWorker = await createWorkerProfile(email);
        console.log('getCurrentWorker: Created new worker:', newWorker);
        return newWorker;
      } catch (createError) {
        console.error('getCurrentWorker: Failed to create worker:', createError);
        return null;
      }
    }
    
    console.log(`getCurrentWorker: Worker data for email: ${email}`, data);
    
    return data;
  } catch (error) {
    console.error('getCurrentWorker: Error in getCurrentWorker:', error);
    return null;
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