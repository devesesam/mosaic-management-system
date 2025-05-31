import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAllWorkers, createWorker, deleteWorker } from '../api/workersApi';
import { Worker } from '../types';
import toast from 'react-hot-toast';

/**
 * Hook for managing workers data
 * No authentication dependency - uses public RLS policies
 */
export function useWorkersData() {
  const queryClient = useQueryClient();

  // Main query to fetch all workers
  const { 
    data: workers = [], 
    isLoading, 
    error, 
    refetch 
  } = useQuery({
    queryKey: ['workers'],
    queryFn: async () => {
      console.log('useWorkersData: Fetching workers');
      
      try {
        const result = await getAllWorkers();
        console.log('useWorkersData: Fetched', result.length, 'workers');
        return result;
      } catch (error) {
        console.error('useWorkersData: Error fetching workers:', error);
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
      console.error('useWorkersData: Error in query:', error);
      toast.error('Failed to load workers: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  });

  // Mutation for adding a worker
  const addWorkerMutation = useMutation({
    mutationFn: async (worker: Omit<Worker, 'id' | 'created_at'>) => {
      console.log('useWorkersData: Adding worker:', worker);
      
      try {
        const result = await createWorker(worker);
        console.log('useWorkersData: Worker added successfully');
        return result;
      } catch (error) {
        console.error('useWorkersData: Error adding worker:', error);
        throw error;
      }
    },
    onSuccess: () => {
      console.log('useWorkersData: Worker added, invalidating queries');
      queryClient.invalidateQueries({ queryKey: ['workers'] });
      refetch(); // Force immediate refetch
      toast.success('Worker added successfully');
    },
    onError: (error) => {
      console.error('useWorkersData: Error in mutation:', error);
      toast.error('Failed to add worker: ' + (error instanceof Error ? error.message : 'Unknown error'));
    },
  });

  // Mutation for deleting a worker
  const deleteWorkerMutation = useMutation({
    mutationFn: async (workerId: string) => {
      try {
        await deleteWorker(workerId);
        return workerId;
      } catch (error) {
        console.error('useWorkersData: Error deleting worker:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers'] });
      refetch(); // Force immediate refetch
      toast.success('Worker deleted successfully');
    },
    onError: (error) => {
      console.error('useWorkersData: Error in mutation:', error);
      toast.error('Failed to delete worker: ' + (error instanceof Error ? error.message : 'Unknown error'));
    },
  });

  // Return everything needed to work with workers
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