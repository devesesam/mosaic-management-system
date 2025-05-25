import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getWorkers, createWorker, deleteWorker } from '../lib/supabase';
import { Worker } from '../types';
import toast from 'react-hot-toast';

export function useWorkers({ enabled = true } = {}) {
  const queryClient = useQueryClient();

  // Use smaller staleTime to ensure more frequent refreshes
  const { data: workers = [], isLoading, error, refetch } = useQuery({
    queryKey: ['workers'],
    queryFn: getWorkers,
    enabled,
    staleTime: 1000 * 10, // 10 seconds before refetching
    refetchOnWindowFocus: true,
    retry: 3, // Try 3 times before giving up
    refetchInterval: 10000 // Automatic refresh every 10 seconds
  });

  const addWorkerMutation = useMutation({
    mutationFn: (worker: Omit<Worker, 'id' | 'created_at'>) => createWorker(worker),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers'] });
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
      toast.success('Worker deleted successfully');
    },
    onError: (error) => {
      console.error('Error deleting worker:', error);
      toast.error('Failed to delete worker');
    },
  });

  // Debug workers on mount
  console.log(`useWorkers: Worker data loaded with ${workers.length} workers`);

  return {
    workers,
    isLoading,
    error,
    refetch,
    addWorker: addWorkerMutation.mutate,
    deleteWorker: deleteWorkerMutation.mutate,
    isAddingWorker: addWorkerMutation.isPending,
    isDeletingWorker: deleteWorkerMutation.isPending,
  };
}