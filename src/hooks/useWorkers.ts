import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createWorker, getWorkers, deleteWorker } from '../lib/supabase';
import { Worker } from '../types';
import toast from 'react-hot-toast';

export function useWorkers({ enabled = true } = {}) {
  const queryClient = useQueryClient();

  const { data: workers = [], isLoading, error, refetch } = useQuery({
    queryKey: ['workers'],
    queryFn: getWorkers,
    enabled,
    staleTime: 1000 * 60 * 60, // 1 hour before data is considered stale
    refetchOnWindowFocus: false, // Don't refetch when window gains focus
    retry: 3,
    retryDelay: 1000,
    onError: (error) => {
      console.error('useWorkers: Error fetching workers:', error);
      toast.error('Failed to load workers');
    }
  });

  // Force fetch only once on mount
  React.useEffect(() => {
    if (enabled) {
      console.log('useWorkers: Initial fetch only');
      refetch();
    }
  }, [enabled, refetch]);

  const addWorkerMutation = useMutation({
    mutationFn: (worker: Omit<Worker, 'id' | 'created_at'>) => {
      console.log('useWorkers: Adding worker:', worker);
      return createWorker(worker);
    },
    onSuccess: (data) => {
      console.log('useWorkers: Worker added successfully:', data);
      queryClient.invalidateQueries({ queryKey: ['workers'] });
      toast.success('Worker added successfully');
    },
    onError: (error) => {
      console.error('Error adding worker:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to add worker');
    },
  });

  const deleteWorkerMutation = useMutation({
    mutationFn: (id: string) => deleteWorker(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers'] });
      toast.success('Worker deleted successfully');
    },
    onError: (error) => {
      console.error('Error deleting worker:', error);
      toast.error('Failed to delete worker');
    },
  });

  // Log data changes - only on first load or actual data changes
  React.useEffect(() => {
    console.log('useWorkers: Workers data loaded:', {
      count: workers.length,
      loading: isLoading,
      error: error ? 'Error loading workers' : null,
      first_worker: workers.length > 0 ? workers[0].name : 'No workers'
    });
  }, [workers, isLoading, error]);

  return {
    workers,
    isLoading,
    error,
    refetch,
    addWorker: (worker: Omit<Worker, 'id' | 'created_at'>) => {
      return addWorkerMutation.mutateAsync(worker);
    },
    deleteWorker: deleteWorkerMutation.mutate,
    isAddingWorker: addWorkerMutation.isPending,
    isDeletingWorker: deleteWorkerMutation.isPending,
  };
}