import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getJobs, createJob, updateJob, deleteJob } from '../lib/supabase';
import { Job } from '../types';
import toast from 'react-hot-toast';

export function useJobs() {
  const queryClient = useQueryClient();

  // Direct query with no auto-refetching or caching
  const { data: jobs = [], isLoading, error, refetch } = useQuery({
    queryKey: ['jobs'],
    queryFn: async () => {
      console.log('useJobs: Explicitly fetching jobs data');
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
    },
    enabled: true, // Always enabled regardless of auth state
    staleTime: Infinity, // Never consider data stale
    refetchOnWindowFocus: false, // Don't refetch when window gains focus
    retry: 3,
    retryDelay: 1000,
    gcTime: Infinity, // Keep data in cache forever
    onError: (error) => {
      console.error('useJobs: Error fetching jobs:', error);
      toast.error('Failed to load jobs');
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
    mutationFn: (job: Omit<Job, 'id' | 'created_at'>) => createJob(job),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast.success('Job created successfully');
    },
    onError: (error) => {
      console.error('Error creating job:', error);
      toast.error('Failed to create job');
    },
  });

  const updateJobMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Job> }) =>
      updateJob(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast.success('Job updated successfully');
    },
    onError: (error) => {
      console.error('Error updating job:', error);
      toast.error('Failed to update job');
    },
  });

  const deleteJobMutation = useMutation({
    mutationFn: deleteJob,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast.success('Job deleted successfully');
    },
    onError: (error) => {
      console.error('Error deleting job:', error);
      toast.error('Failed to delete job');
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