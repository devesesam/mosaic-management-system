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
    const { data, error } = await supabase
      .from('workers')
      .select('*')
      .order('name');
    
    if (error) {
      console.error('Error fetching workers:', error);
      throw error;
    }
    
    console.log(`getWorkers: Successfully retrieved ${data?.length || 0} workers`);
    return data || [];
  } catch (error) {
    console.error('Error in getWorkers:', error);
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
    // Using the function we created in the migration
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
    
    const { data, error } = await supabase
      .from('workers')
      .select('*')
      .eq('email', email)
      .maybeSingle();
    
    if (error) {
      console.error('getCurrentWorker: Error fetching current worker:', error);
      throw error;
    }
    
    console.log('getCurrentWorker: Worker data for email:', email, data);
    
    return data;
  } catch (error) {
    console.error('getCurrentWorker: Error in getCurrentWorker:', error);
    throw error;
  }
};

export const getJobs = async () => {
  try {
    if (!isSupabaseInitialized()) {
      throw new Error('Supabase is not properly initialized');
    }

    console.log('getJobs: Fetching all jobs');
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (jobsError) {
      console.error('Error fetching jobs:', jobsError);
      throw jobsError;
    }

    console.log(`getJobs: Retrieved ${jobs?.length || 0} jobs`);
    
    const { data: secondaryWorkers, error: secondaryError } = await supabase
      .from('job_secondary_workers')
      .select('*');

    if (secondaryError) {
      console.error('Error fetching secondary workers:', secondaryError);
      throw secondaryError;
    }

    console.log(`getJobs: Retrieved ${secondaryWorkers?.length || 0} secondary worker assignments`);

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

// Function to directly create a worker profile for a new user
export const createWorkerProfile = async (email: string, name?: string) => {
  try {
    console.log(`Creating worker profile for ${email}...`);
    
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
    
    console.log('Worker profile created/updated:', data);
    return data;
  } catch (error) {
    console.error('Error creating worker profile:', error);
    throw error;
  }
};