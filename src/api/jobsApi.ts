import { supabase, handleSupabaseError, ensureConnection } from './supabaseClient';
import { Job } from '../types';

/**
 * Get all jobs from the database with their secondary workers
 */
export const getAllJobs = async (): Promise<Job[]> => {
  try {
    console.log('JobsAPI: Fetching all jobs');
    
    // Ensure connection is tested
    await ensureConnection();
    
    // Log immediately before the actual Supabase call
    console.log('JobsAPI: CRITICAL - About to execute supabase.from("jobs").select()');
    console.time('JobsAPI: jobs query execution time');
    
    // Fetch jobs with detailed error handling
    const { data: jobs, error: jobsError, status, statusText } = await supabase
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false });
    
    console.timeEnd('JobsAPI: jobs query execution time');
    console.log('JobsAPI: CRITICAL - Supabase jobs query completed with status:', status, statusText);
    
    if (jobsError) {
      console.error('JobsAPI: CRITICAL ERROR - Failed to fetch jobs:', jobsError);
      console.error('JobsAPI: Error details:', JSON.stringify(jobsError, null, 2));
      throw new Error(`Failed to fetch jobs: ${jobsError.message || 'Unknown database error'}`);
    }

    console.log('JobsAPI: Jobs data received, count:', jobs?.length || 0);
    
    if (!jobs || jobs.length === 0) {
      console.log('JobsAPI: No jobs found in database');
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

    // Fetch secondary workers
    console.log('JobsAPI: CRITICAL - About to fetch secondary workers');
    console.time('JobsAPI: secondary workers query time');
    
    const { data: secondaryWorkers, error: secondaryError, status: secondaryStatus } = await supabase
      .from('job_secondary_workers')
      .select('*');
    
    console.timeEnd('JobsAPI: secondary workers query time');
    console.log('JobsAPI: CRITICAL - Secondary workers query completed with status:', secondaryStatus);

    if (secondaryError) {
      console.error('JobsAPI: Error fetching secondary workers:', secondaryError);
      console.log('JobsAPI: Secondary workers error details:', JSON.stringify(secondaryError, null, 2));
      // Continue with empty secondary workers rather than failing
    } else {
      console.log('JobsAPI: Secondary workers data received, count:', secondaryWorkers?.length || 0);
    }

    // Add secondary worker IDs to each job
    const jobsWithSecondaryWorkers = processedJobs.map(job => ({
      ...job,
      secondary_worker_ids: (secondaryWorkers || [])
        .filter(sw => sw.job_id === job.id)
        .map(sw => sw.worker_id)
    }));

    console.log('JobsAPI: Successfully processed all jobs with secondary workers');
    return jobsWithSecondaryWorkers;
  } catch (error) {
    console.error('JobsAPI: CRITICAL - Exception during job fetching:', error);
    throw handleSupabaseError(error);
  }
};

/**
 * Create a new job
 */
export const createJob = async (jobData: Omit<Job, 'id' | 'created_at'>): Promise<Job> => {
  try {
    console.log('JobsAPI: Creating new job');
    console.log('JobsAPI: Job data to create:', JSON.stringify(jobData, null, 2));
    
    // Ensure connection is tested
    await ensureConnection();
    
    const { secondary_worker_ids, ...jobBase } = jobData as any;
    
    // Insert the main job record
    console.log('JobsAPI: CRITICAL - About to insert new job');
    console.time('JobsAPI: job creation time');
    
    const { data: newJob, error: jobError, status, statusText } = await supabase
      .from('jobs')
      .insert([jobBase])
      .select()
      .single();
    
    console.timeEnd('JobsAPI: job creation time');
    console.log('JobsAPI: Job creation completed with status:', status, statusText);
    
    if (jobError) {
      console.error('JobsAPI: Error creating job:', jobError);
      console.error('JobsAPI: Job error details:', JSON.stringify(jobError, null, 2));
      throw new Error(`Failed to create job: ${jobError.message || 'Unknown database error'}`);
    }

    console.log('JobsAPI: Job created successfully with ID:', newJob.id);

    // Handle secondary workers if provided
    if (secondary_worker_ids?.length) {
      console.log('JobsAPI: Adding secondary workers:', secondary_worker_ids.length);
      
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
      } else {
        console.log('JobsAPI: Secondary workers added successfully');
      }
    }
    
    return {
      ...newJob,
      secondary_worker_ids: secondary_worker_ids || []
    };
  } catch (error) {
    console.error('JobsAPI: Exception during job creation:', error);
    throw handleSupabaseError(error);
  }
};

/**
 * Get jobs for a specific worker
 */
export const getJobsForWorker = async (workerId: string): Promise<Job[]> => {
  try {
    console.log('JobsAPI: Fetching jobs for worker:', workerId);
    
    await ensureConnection();
    
    console.log('JobsAPI: CRITICAL - About to query jobs for worker');
    const { data, error, status } = await supabase
      .from('jobs')
      .select('*')
      .eq('worker_id', workerId);
    
    console.log('JobsAPI: Worker jobs query completed with status:', status);

    if (error) {
      console.error('JobsAPI: Error fetching worker jobs:', error);
      throw error;
    }

    console.log(`JobsAPI: Found ${data?.length || 0} jobs for worker ${workerId}`);
    return data || [];
  } catch (error) {
    console.error('JobsAPI: Exception fetching worker jobs:', error);
    throw handleSupabaseError(error);
  }
};

/**
 * Update an existing job
 */
export const updateJob = async (id: string, updates: Partial<Job>): Promise<Job> => {
  try {
    console.log('JobsAPI: Updating job:', id);
    console.log('JobsAPI: Update data:', JSON.stringify(updates, null, 2));
    
    await ensureConnection();
    
    const { secondary_worker_ids, ...jobUpdates } = updates as any;
    
    // Update the main job record
    console.log('JobsAPI: CRITICAL - About to update job');
    const { data: updatedJob, error: jobError } = await supabase
      .from('jobs')
      .update(jobUpdates)
      .eq('id', id)
      .select()
      .single();
    
    if (jobError) {
      console.error('JobsAPI: Error updating job:', jobError);
      throw new Error(`Failed to update job: ${jobError.message || 'Unknown database error'}`);
    }

    console.log('JobsAPI: Job updated successfully:', id);

    // Handle secondary workers if included in the updates
    if (secondary_worker_ids !== undefined) {
      // Delete existing secondary workers
      console.log('JobsAPI: CRITICAL - Removing existing secondary workers');
      const { error: deleteError } = await supabase
        .from('job_secondary_workers')
        .delete()
        .eq('job_id', id);
        
      if (deleteError) {
        console.error('JobsAPI: Error deleting secondary workers:', deleteError);
      }

      // Add new secondary workers if any
      if (secondary_worker_ids?.length) {
        console.log('JobsAPI: CRITICAL - Adding new secondary workers:', secondary_worker_ids.length);
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
    console.log('JobsAPI: CRITICAL - Fetching final secondary workers');
    const { data: currentSecondaryWorkers, error: fetchError } = await supabase
      .from('job_secondary_workers')
      .select('worker_id')
      .eq('job_id', id);
      
    if (fetchError) {
      console.error('JobsAPI: Error fetching updated secondary workers:', fetchError);
    }

    return {
      ...updatedJob,
      secondary_worker_ids: (currentSecondaryWorkers || []).map(sw => sw.worker_id)
    };
  } catch (error) {
    console.error('JobsAPI: Exception during job update:', error);
    throw handleSupabaseError(error);
  }
};

/**
 * Delete a job
 */
export const deleteJob = async (id: string): Promise<void> => {
  try {
    console.log('JobsAPI: Deleting job:', id);
    
    await ensureConnection();
    
    // Delete the job (secondary workers will be cascade deleted by foreign key)
    console.log('JobsAPI: CRITICAL - About to delete job');
    const { error, status } = await supabase
      .from('jobs')
      .delete()
      .eq('id', id);
    
    console.log('JobsAPI: Delete job completed with status:', status);

    if (error) {
      console.error('JobsAPI: Error deleting job:', error);
      throw new Error(`Failed to delete job: ${error.message || 'Unknown database error'}`);
    }
    
    console.log('JobsAPI: Job deleted successfully:', id);
  } catch (error) {
    console.error('JobsAPI: Exception during job deletion:', error);
    throw handleSupabaseError(error);
  }
};