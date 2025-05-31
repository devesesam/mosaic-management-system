import { supabase, handleSupabaseError } from './supabaseClient';
import { Job } from '../types';

/**
 * Get all jobs from the database with their secondary workers
 * No authentication required - using public access RLS policies
 */
export const getAllJobs = async (): Promise<Job[]> => {
  try {
    console.log('JobsAPI: Fetching all jobs');
    
    // Fetch jobs with a simple query (no auth needed)
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (jobsError) {
      throw jobsError;
    }

    if (!jobs || jobs.length === 0) {
      console.log('JobsAPI: No jobs found');
      return [];
    }

    // Process jobs to ensure consistent format
    const processedJobs = jobs.map(job => ({
      ...job,
      start_date: job.start_date || null,
      end_date: job.end_date || null,
      status: job.status || 'Awaiting Order',
      tile_color: job.tile_color || '#3b82f6'
    }));

    // Now fetch secondary worker assignments
    const { data: secondaryWorkers, error: secondaryError } = await supabase
      .from('job_secondary_workers')
      .select('*');

    if (secondaryError) {
      console.error('JobsAPI: Error fetching secondary workers:', secondaryError);
      // Continue with empty secondary workers rather than failing
    }

    // Add secondary worker IDs to each job
    const jobsWithSecondaryWorkers = processedJobs.map(job => ({
      ...job,
      secondary_worker_ids: (secondaryWorkers || [])
        .filter(sw => sw.job_id === job.id)
        .map(sw => sw.worker_id)
    }));

    console.log(`JobsAPI: Successfully fetched ${jobsWithSecondaryWorkers.length} jobs`);
    return jobsWithSecondaryWorkers;
  } catch (error) {
    throw handleSupabaseError(error);
  }
};

/**
 * Create a new job
 */
export const createJob = async (jobData: Omit<Job, 'id' | 'created_at'>): Promise<Job> => {
  try {
    console.log('JobsAPI: Creating new job');
    const { secondary_worker_ids, ...jobBase } = jobData as any;
    
    // Insert the main job record
    const { data: newJob, error: jobError } = await supabase
      .from('jobs')
      .insert([jobBase])
      .select()
      .single();
    
    if (jobError) {
      throw jobError;
    }

    // Handle secondary workers if provided
    if (secondary_worker_ids?.length) {
      const secondaryWorkerData = secondary_worker_ids.map(worker_id => ({
        job_id: newJob.id,
        worker_id
      }));

      const { error: secondaryError } = await supabase
        .from('job_secondary_workers')
        .insert(secondaryWorkerData);

      if (secondaryError) {
        console.error('JobsAPI: Error adding secondary workers:', secondaryError);
        // Continue despite error with secondary workers
      }
    }
    
    console.log('JobsAPI: Job created successfully:', newJob.id);
    return {
      ...newJob,
      secondary_worker_ids: secondary_worker_ids || []
    };
  } catch (error) {
    throw handleSupabaseError(error);
  }
};

/**
 * Update an existing job
 */
export const updateJob = async (id: string, updates: Partial<Job>): Promise<Job> => {
  try {
    console.log('JobsAPI: Updating job:', id);
    
    const { secondary_worker_ids, ...jobUpdates } = updates as any;
    
    // Update the main job record
    const { data: updatedJob, error: jobError } = await supabase
      .from('jobs')
      .update(jobUpdates)
      .eq('id', id)
      .select()
      .single();
    
    if (jobError) {
      throw jobError;
    }

    // Handle secondary workers if included in the updates
    if (secondary_worker_ids !== undefined) {
      // Delete existing secondary workers
      const { error: deleteError } = await supabase
        .from('job_secondary_workers')
        .delete()
        .eq('job_id', id);
        
      if (deleteError) {
        console.error('JobsAPI: Error deleting secondary workers:', deleteError);
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
          console.error('JobsAPI: Error adding secondary workers:', insertError);
        }
      }
    }

    // Get final secondary workers for the response
    const { data: currentSecondaryWorkers } = await supabase
      .from('job_secondary_workers')
      .select('worker_id')
      .eq('job_id', id);

    console.log('JobsAPI: Job updated successfully:', id);
    return {
      ...updatedJob,
      secondary_worker_ids: (currentSecondaryWorkers || []).map(sw => sw.worker_id)
    };
  } catch (error) {
    throw handleSupabaseError(error);
  }
};

/**
 * Delete a job
 */
export const deleteJob = async (id: string): Promise<void> => {
  try {
    console.log('JobsAPI: Deleting job:', id);
    
    // Delete the job (secondary workers will be cascade deleted by foreign key)
    const { error } = await supabase
      .from('jobs')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }
    
    console.log('JobsAPI: Job deleted successfully:', id);
  } catch (error) {
    throw handleSupabaseError(error);
  }
};

/**
 * Get jobs for a specific worker
 */
export const getJobsForWorker = async (workerId: string): Promise<Job[]> => {
  try {
    console.log('JobsAPI: Fetching jobs for worker:', workerId);
    
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('worker_id', workerId);

    if (error) {
      throw error;
    }

    console.log(`JobsAPI: Found ${data?.length || 0} jobs for worker ${workerId}`);
    return data || [];
  } catch (error) {
    throw handleSupabaseError(error);
  }
};