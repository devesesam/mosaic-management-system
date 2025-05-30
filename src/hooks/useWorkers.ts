import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createWorker, getWorkers, deleteWorker } from '../lib/supabase';
import { Worker } from '../types';
import toast from 'react-hot-toast';

export function useWorkers() {
  const queryClient = useQueryClient();

  // Use query with better error handling
  const { 
    data: workers = [], 
    isLoading, 
    error, 
    refetch 
  } = useQuery({
    queryKey: ['workers'],
    queryFn: async () => {
      console.log('useWorkers: Explicitly fetching workers data');
      
      try {
        const result = await getWorkers();
        console.log('useWorkers: Got', result.length, 'workers');
        return result;
      } catch (error) {
        console.error('useWorkers: Error fetching workers:', error);
        throw new Error(error instanceof Error ? error.message : 'Failed to fetch workers');
      }
    },
    enabled: true, // Always enabled, don't wait for session
    staleTime: 60000, // Consider data stale after 1 minute
    refetchOnWindowFocus: false,
    retry: 2,
    retryDelay: 1000,
    gcTime: 300000, // Keep data in cache for 5 minutes
    onError: (error) => {
      console.error('useWorkers: Error fetching workers:', error);
      toast.error('Failed to load workers: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  });

  // Debug logging when workers data changes
  React.useEffect(() => {
    if (workers.length > 0) {
      console.log('useWorkers: Workers data updated:', {
        count: workers.length,
        firstWorker: workers.length > 0 ? workers[0].name : 'No workers'
      });
    }
  }, [workers]);

  const addWorkerMutation = useMutation({
    mutationFn: async (worker: Omit<Worker, 'id' | 'created_at'>) => {
      console.log('useWorkers: Adding worker:', worker);
      
      try {
        const result = await createWorker(worker);
        console.log('useWorkers: Worker added successfully:', result);
        return result;
      } catch (error) {
        console.error('useWorkers: Error adding worker:', error);
        throw new Error(error instanceof Error ? error.message : 'Failed to add worker');
      }
    },
    onSuccess: () => {
      console.log('useWorkers: Worker added, invalidating queries');
      queryClient.invalidateQueries({ queryKey: ['workers'] });
      refetch(); // Force immediate refetch
      toast.success('Worker added successfully');
    },
    onError: (error) => {
      console.error('Error adding worker:', error);
      toast.error('Failed to add worker: ' + (error instanceof Error ? error.message : 'Unknown error'));
    },
  });

  const deleteWorkerMutation = useMutation({
    mutationFn: async (workerId: string) => {
      try {
        const result = await deleteWorker(workerId);
        return result;
      } catch (error) {
        console.error('useWorkers: Error deleting worker:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers'] });
      refetch(); // Force immediate refetch
      toast.success('Worker deleted successfully');
    },
    onError: (error) => {
      console.error('Error deleting worker:', error);
      toast.error('Failed to delete worker: ' + (error instanceof Error ? error.message : 'Unknown error'));
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