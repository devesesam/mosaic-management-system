import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createWorker, getWorkers, deleteWorker } from '../lib/supabase';
import { Worker } from '../types';
import toast from 'react-hot-toast';

export function useWorkers() {
  const queryClient = useQueryClient();

  // Use query with better error handling and timeouts
  const { 
    data: workers = [], 
    isLoading, 
    error, 
    refetch 
  } = useQuery({
    queryKey: ['workers'],
    queryFn: async () => {
      console.log('useWorkers: Explicitly fetching workers data');
      
      // Add timeout to prevent hanging
      const workersPromise = getWorkers();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Workers fetch timeout')), 30000)
      );
      
      try {
        const result = await Promise.race([
          workersPromise,
          timeoutPromise
        ]) as Worker[];
        
        console.log('useWorkers: Got', result.length, 'workers');
        return result;
      } catch (error) {
        console.error('useWorkers: Error fetching workers:', error);
        throw new Error(error instanceof Error ? error.message : 'Failed to fetch workers');
      }
    },
    enabled: true,
    staleTime: 60000, // Consider data stale after 1 minute
    refetchOnWindowFocus: false,
    retry: 2,
    retryDelay: 1000,
    gcTime: 300000, // Keep data in cache for 5 minutes
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
      
      // Add timeout to prevent hanging
      const createPromise = createWorker(worker);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Create worker timeout')), 30000)
      );
      
      try {
        const result = await Promise.race([
          createPromise,
          timeoutPromise
        ]) as Worker;
        
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
      toast.error('Failed to add worker');
    },
  });

  const deleteWorkerMutation = useMutation({
    mutationFn: async (workerId: string) => {
      // Add timeout to prevent hanging
      const deletePromise = deleteWorker(workerId);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Delete worker timeout')), 30000)
      );
      
      return Promise.race([deletePromise, timeoutPromise]);
    },
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