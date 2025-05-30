import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getJobs, createJob, updateJob, deleteJob, verifySupabaseConnection } from '../lib/supabase';
import { Job } from '../types';
import toast from 'react-hot-toast';

export function useJobs() {
  const queryClient = useQueryClient();

  // Use query with better error handling
  const { 
    data: jobs = [], 
    isLoading, 
    error, 
    refetch 
  } = useQuery({
    queryKey: ['jobs'],
    queryFn: async () => {
      console.log('useJobs: Explicitly fetching jobs data');
      
      // Check connection first
      const connectionStatus = await verifySupabaseConnection();
      if (!connectionStatus.connected) {
        throw new Error(`Cannot fetch jobs: Database connection failed (${connectionStatus.error?.message})`);
      }
      
      try {
        const result = await getJobs();
        
        console.log('useJobs: Got', result.length, 'jobs');
        
        // Ensure all jobs have the required fields for the calendar
        const validatedJobs = result.map(job => ({
          ...job,
          // Convert dates to strings if they're not already
          start_date: job.start_date ? job.start_date : null,
          end_date: job.end_date ? job.end_date : null,
          // Ensure other required fields
          status: job.status || 'Awaiting Order',
          tile_color: job.tile_color || '#3b82f6',
          secondary_worker_ids: job.secondary_worker_ids || []
        }));
        
        // Log the first job for debugging
        if (validatedJobs.length > 0) {
          console.log('useJobs: First job sample:', {
            id: validatedJobs[0].id,
            address: validatedJobs[0].address,
            start_date: validatedJobs[0].start_date,
            end_date: validatedJobs[0].end_date,
            worker_id: validatedJobs[0].worker_id
          });
        }
        
        return validatedJobs;
      } catch (error) {
        console.error('useJobs: Error fetching jobs:', error);
        throw new Error(error instanceof Error ? error.message : 'Failed to fetch jobs');
      }
    },
    enabled: true,
    staleTime: 60000, // Consider data stale after 1 minute
    refetchOnWindowFocus: false,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * (2 ** attemptIndex), 30000), // Exponential backoff
    gcTime: 300000, // Keep data in cache for 5 minutes
    onError: (error) => {
      console.error('useJobs: Error fetching jobs:', error);
      toast.error('Failed to load jobs: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  });

  // Debug logging when jobs data changes
  React.useEffect(() => {
    console.log('useJobs: Jobs data updated:', {
      count: jobs.length,
      firstJob: jobs.length > 0 ? jobs[0].address : 'No jobs'
    });
  }, [jobs]);

  const addJobMutation = useMutation({
    mutationFn: async (job: Omit<Job, 'id' | 'created_at'>) => {
      // Check connection first
      const connectionStatus = await verifySupabaseConnection();
      if (!connectionStatus.connected) {
        throw new Error(`Cannot create job: Database connection failed (${connectionStatus.error?.message})`);
      }
      
      return createJob(job);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast.success('Job created successfully');
    },
    onError: (error) => {
      console.error('Error creating job:', error);
      toast.error('Failed to create job: ' + (error instanceof Error ? error.message : 'Unknown error'));
    },
  });

  const updateJobMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Job> }) => {
      // Check connection first
      const connectionStatus = await verifySupabaseConnection();
      if (!connectionStatus.connected) {
        throw new Error(`Cannot update job: Database connection failed (${connectionStatus.error?.message})`);
      }
      
      return updateJob(id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast.success('Job updated successfully');
    },
    onError: (error) => {
      console.error('Error updating job:', error);
      toast.error('Failed to update job: ' + (error instanceof Error ? error.message : 'Unknown error'));
    },
  });

  const deleteJobMutation = useMutation({
    mutationFn: async (id: string) => {
      // Check connection first
      const connectionStatus = await verifySupabaseConnection();
      if (!connectionStatus.connected) {
        throw new Error(`Cannot delete job: Database connection failed (${connectionStatus.error?.message})`);
      }
      
      return deleteJob(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast.success('Job deleted successfully');
    },
    onError: (error) => {
      console.error('Error deleting job:', error);
      toast.error('Failed to delete job: ' + (error instanceof Error ? error.message : 'Unknown error'));
    },
  });

  return {
    jobs,
    isLoading,
    error,
    refetch,
    addJob: addJobMutation.mutate,
    updateJob: (id: string, updates: Partial<Job>) => {
      return updateJobMutation.mutate({ id, updates });
    },
    deleteJob: deleteJobMutation.mutate,
    isAddingJob: addJobMutation.isPending,
    isUpdatingJob: updateJobMutation.isPending,
    isDeletingJob: deleteJobMutation.isPending,
  };
}