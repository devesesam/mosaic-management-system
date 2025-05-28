import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createWorker, getWorkers, deleteWorker } from '../lib/supabase';
import { Worker } from '../types';
import toast from 'react-hot-toast';

export function useWorkers() {
  const queryClient = useQueryClient();

  // Direct query with no auto-refetching or caching
  const { data: workers = [], isLoading, error, refetch } = useQuery({
    queryKey: ['workers'],
    queryFn: async () => {
      console.log('useWorkers: Explicitly fetching workers data');
      const result = await getWorkers();
      console.log('useWorkers: Got', result.length, 'workers');
      return result;
    },
    enabled: true, // Always enabled regardless of auth state
    staleTime: Infinity, // Never consider data stale
    refetchOnWindowFocus: false, // Don't refetch when window gains focus
    retry: 3,
    retryDelay: 1000,
    gcTime: Infinity, // Keep data in cache forever
    onError: (error) => {
      console.error('useWorkers: Error fetching workers:', error);
      toast.error('Failed to load workers');
    }
  });

  // Debug logging when workers data changes
  React.useEffect(() => {
    console.log('useWorkers: Workers data updated:', {
      count: workers.length,
      firstWorker: workers.length > 0 ? workers[0].name : 'No workers'
    });
  }, [workers]);

  const addWorkerMutation = useMutation({
    mutationFn: async (worker: Omit<Worker, 'id' | 'created_at'>) => {
      console.log('useWorkers: Adding worker:', worker);
      const result = await createWorker(worker);
      console.log('useWorkers: Worker added successfully:', result);
      return result;
    },
    onSuccess: () => {
      console.log('useWorkers: Worker added, invalidating queries');
      queryClient.invalidateQueries({ queryKey: ['workers'] });
      refetch(); // Force immediate refetch
      toast.success('Worker added successfully');
    },
    onError: (error) => {
      console.error('Error adding worker:', error);
      toast.error('Failed to add worker');
    },
  });

  const deleteWorkerMutation = useMutation({
    mutationFn: deleteWorker,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers'] });
      refetch(); // Force immediate refetch
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
    addWorker: addWorkerMutation.mutateAsync,
    deleteWorker: deleteWorkerMutation.mutate,
    isAddingWorker: addWorkerMutation.isPending,
    isDeletingWorker: deleteWorkerMutation.isPending,
  };
}