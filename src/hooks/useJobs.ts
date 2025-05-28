import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getJobs, createJob, updateJob, deleteJob } from '../lib/supabase';
import { Job } from '../types';
import toast from 'react-hot-toast';

export function useJobs({ enabled = true } = {}) {
  const queryClient = useQueryClient();

  // Make the query fetch only once and not continuously
  const { data: jobs = [], isLoading, error, refetch } = useQuery({
    queryKey: ['jobs'],
    queryFn: getJobs,
    enabled: true, // Always enabled to fix data loading issues
    staleTime: Infinity, // Don't refetch automatically
    refetchOnWindowFocus: false, // Don't refetch when window gains focus
    retry: 3,
    retryDelay: 1000,
    onError: (error) => {
      console.error('useJobs: Error fetching jobs:', error);
      toast.error('Failed to load jobs. Please refresh the page.');
    }
  });

  // Debug useEffect - log whenever the jobs data changes
  React.useEffect(() => {
    console.log('useJobs: Jobs data loaded:', {
      count: jobs.length,
      loading: isLoading,
      error: error ? 'Error loading jobs' : null,
      first_job: jobs.length > 0 ? jobs[0].address : 'No jobs'
    });
  }, [jobs, isLoading, error]);

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