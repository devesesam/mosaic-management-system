import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getJobs, createJob, updateJob, deleteJob } from '../lib/supabase';
import { Job } from '../types';
import toast from 'react-hot-toast';

export function useJobs() {
  const queryClient = useQueryClient();

  // Simpler, more direct query without auth dependencies
  const { 
    data: jobs = [], 
    isLoading, 
    error, 
    refetch 
  } = useQuery({
    queryKey: ['jobs'],
    queryFn: async () => {
      console.log('useJobs: Fetching jobs data');
      
      try {
        const result = await getJobs();
        console.log('useJobs: Got', result.length, 'jobs');
        
        // Ensure all jobs have the required fields for the calendar
        return result.map(job => ({
          ...job,
          // Set defaults for required fields
          status: job.status || 'Awaiting Order',
          tile_color: job.tile_color || '#3b82f6',
          secondary_worker_ids: job.secondary_worker_ids || []
        }));
      } catch (error) {
        console.error('useJobs: Error fetching jobs:', error);
        throw error;
      }
    },
    enabled: true, // Always enabled, don't wait for auth
    staleTime: 60000, // Consider data stale after 1 minute
    refetchOnWindowFocus: false,
    retry: 1, // Only retry once to avoid flooding with requests
    retryDelay: 1000,
    gcTime: 300000, // Keep data in cache for 5 minutes
    onError: (error) => {
      console.error('useJobs: Error fetching jobs:', error);
      toast.error('Failed to load jobs: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  });

  // Debug logging when jobs data changes
  React.useEffect(() => {
    if (jobs.length > 0) {
      console.log('useJobs: Jobs data updated, count:', jobs.length);
    }
  }, [jobs]);

  const addJobMutation = useMutation({
    mutationFn: (job: Omit<Job, 'id' | 'created_at'>) => createJob(job),
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
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Job> }) =>
      updateJob(id, updates),
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
    mutationFn: deleteJob,
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