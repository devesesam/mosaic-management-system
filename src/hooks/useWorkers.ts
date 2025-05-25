import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getWorkers, createWorker, deleteWorker } from '../lib/supabase';
import { Worker } from '../types';
import toast from 'react-hot-toast';

export function useWorkers({ enabled = true } = {}) {
  const queryClient = useQueryClient();

  const { data: workers = [], isLoading, error } = useQuery({
    queryKey: ['workers'],
    queryFn: getWorkers,
    enabled
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

  return {
    workers,
    isLoading,
    error,
    addWorker: addWorkerMutation.mutate,
    deleteWorker: deleteWorkerMutation.mutate,
    isAddingWorker: addWorkerMutation.isPending,
    isDeletingWorker: deleteWorkerMutation.isPending,
  };
}