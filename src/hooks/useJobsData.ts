import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAllJobs, createJob, updateJob, deleteJob } from '../api/jobsApi';
import { Job } from '../types';
import toast from 'react-hot-toast';

/**
 * Hook for managing jobs data
 * No authentication dependency - uses public RLS policies
 */
export function useJobsData() {
  const queryClient = useQueryClient();

  // Main query to fetch all jobs
  const { 
    data: jobs = [], 
    isLoading, 
    error, 
    refetch 
  } = useQuery({
    queryKey: ['jobs'],
    queryFn: async () => {
      console.log('useJobsData: Fetching jobs');
      
      try {
        const result = await getAllJobs();
        console.log('useJobsData: Fetched', result.length, 'jobs');
        
        // Make sure required fields have defaults
        return result.map(job => ({
          ...job,
          status: job.status || 'Awaiting Order',
          tile_color: job.tile_color || '#3b82f6',
          secondary_worker_ids: job.secondary_worker_ids || []
        }));
      } catch (error) {
        console.error('useJobsData: Error fetching jobs:', error);
        throw error;
      }
    },
    enabled: true, // Always enabled - no auth dependency
    staleTime: 60000, // Consider data stale after 1 minute
    refetchOnWindowFocus: false,
    retry: 1,
    retryDelay: 1000,
    gcTime: 300000, // Keep data in cache for 5 minutes
    onError: (error) => {
      console.error('useJobsData: Error in query:', error);
      toast.error('Failed to load jobs: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  });

  // Mutation for adding a job
  const addJobMutation = useMutation({
    mutationFn: (job: Omit<Job, 'id' | 'created_at'>) => createJob(job),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast.success('Job created successfully');
    },
    onError: (error) => {
      console.error('useJobsData: Error creating job:', error);
      toast.error('Failed to create job: ' + (error instanceof Error ? error.message : 'Unknown error'));
    },
  });

  // Mutation for updating a job
  const updateJobMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Job> }) =>
      updateJob(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast.success('Job updated successfully');
    },
    onError: (error) => {
      console.error('useJobsData: Error updating job:', error);
      toast.error('Failed to update job: ' + (error instanceof Error ? error.message : 'Unknown error'));
    },
  });

  // Mutation for deleting a job
  const deleteJobMutation = useMutation({
    mutationFn: deleteJob,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast.success('Job deleted successfully');
    },
    onError: (error) => {
      console.error('useJobsData: Error deleting job:', error);
      toast.error('Failed to delete job: ' + (error instanceof Error ? error.message : 'Unknown error'));
    },
  });

  // Return everything needed to work with jobs
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