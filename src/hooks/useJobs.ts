import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getJobs, createJob, updateJob, deleteJob } from '../lib/supabase';
import { Job } from '../types';
import toast from 'react-hot-toast';

export function useJobs({ enabled = true } = {}) {
  const queryClient = useQueryClient();

  const { 
    data: jobs = [], 
    isLoading, 
    error, 
    refetch, 
    isRefetching,
    dataUpdatedAt
  } = useQuery({
    queryKey: ['jobs'],
    queryFn: getJobs,
    enabled: true, // Always enabled, ignore the parameter
    staleTime: 1000 * 30, // 30 seconds before refetching
    refetchOnWindowFocus: true,
    retry: 3,
    retryDelay: 1000,
    onError: (error) => {
      console.error('useJobs: Error fetching jobs:', error);
      toast.error('Failed to load jobs');
    }
  });

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

  // Log data changes
  React.useEffect(() => {
    console.log('useJobs: Jobs data updated:', {
      count: jobs.length,
      loading: isLoading,
      error: error ? 'Error loading jobs' : null,
      dataUpdatedAt: dataUpdatedAt ? new Date(dataUpdatedAt).toISOString() : null
    });
  }, [jobs, isLoading, error, dataUpdatedAt]);

  // Force refetch on mount
  React.useEffect(() => {
    refetch();
  }, [refetch]);

  return {
    jobs,
    isLoading,
    isRefetching,
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