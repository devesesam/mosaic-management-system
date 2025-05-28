import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createWorker, getWorkers, deleteWorker } from '../lib/supabase';
import { Worker } from '../types';
import toast from 'react-hot-toast';

export function useWorkers({ enabled = true } = {}) {
  const queryClient = useQueryClient();

  // Make the query fetch only once and not continuously
  const { data: workers = [], isLoading, error, refetch } = useQuery({
    queryKey: ['workers'],
    queryFn: getWorkers,
    enabled: true, // Always enabled to fix data loading issues
    staleTime: Infinity, // Don't refetch automatically
    refetchOnWindowFocus: false, // Don't refetch when window gains focus
    retry: 3,
    retryDelay: 1000,
    onError: (error) => {
      console.error('useWorkers: Error fetching workers:', error);
      toast.error('Failed to load workers. Please refresh the page.');
    }
  });

  // Debug useEffect - log whenever the workers data changes
  React.useEffect(() => {
    console.log('useWorkers: Workers data loaded:', {
      count: workers.length,
      loading: isLoading,
      error: error ? 'Error loading workers' : null,
      first_worker: workers.length > 0 ? workers[0].name : 'No workers'
    });
  }, [workers, isLoading, error]);

  const addWorkerMutation = useMutation({
    mutationFn: (worker: Omit<Worker, 'id' | 'created_at'>) => {
      console.log('useWorkers: Adding worker:', worker);
      return createWorker(worker);
    },
    onSuccess: () => {
      console.log('useWorkers: Worker added successfully, invalidating queries');
      queryClient.invalidateQueries({ queryKey: ['workers'] });
      toast.success('Worker added successfully');
    },
    onError: (error) => {
      console.error('Error adding worker:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to add worker');
    },
  });

  const deleteWorkerMutation = useMutation({
    mutationFn: deleteWorker,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers'] });
      toast.success('Worker deleted successfully');
    },
    onError: (error) => {
      console.error('Error deleting worker:', error);
      toast.error('Failed to delete worker');
    },
  });

  return {
    workers,
    isLoading,
    error,
    refetch,
    // Use mutateAsync to get a promise that can be awaited
    addWorker: (worker: Omit<Worker, 'id' | 'created_at'>) => {
      return addWorkerMutation.mutateAsync(worker);
    },
    deleteWorker: deleteWorkerMutation.mutate,
    isAddingWorker: addWorkerMutation.isPending,
    isDeletingWorker: deleteWorkerMutation.isPending,
  };
}