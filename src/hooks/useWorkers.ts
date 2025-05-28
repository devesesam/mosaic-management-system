import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createWorker, getWorkers, deleteWorker } from '../lib/supabase';
import { Worker } from '../types';
import toast from 'react-hot-toast';

export function useWorkers({ enabled = true } = {}) {
  const queryClient = useQueryClient();

  const { 
    data: workers = [], 
    isLoading, 
    error, 
    refetch, 
    isRefetching,
    dataUpdatedAt
  } = useQuery({
    queryKey: ['workers'],
    queryFn: getWorkers,
    enabled: true, // Always enabled, ignore the parameter
    staleTime: 1000 * 30, // 30 seconds before refetching
    refetchOnWindowFocus: true,
    retry: 3,
    retryDelay: 1000,
    onError: (error) => {
      console.error('useWorkers: Error fetching workers:', error);
      toast.error('Failed to load workers');
    }
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

  // Log data changes
  React.useEffect(() => {
    console.log('useWorkers: Workers data updated:', {
      count: workers.length,
      loading: isLoading,
      error: error ? 'Error loading workers' : null,
      dataUpdatedAt: dataUpdatedAt ? new Date(dataUpdatedAt).toISOString() : null
    });
  }, [workers, isLoading, error, dataUpdatedAt]);

  // Force refetch on mount
  React.useEffect(() => {
    refetch();
  }, [refetch]);

  return {
    workers,
    isLoading,
    isRefetching,
    error,
    refetch,
    addWorker: addWorkerMutation.mutate,
    deleteWorker: deleteWorkerMutation.mutate,
    isAddingWorker: addWorkerMutation.isPending,
    isDeletingWorker: deleteWorkerMutation.isPending,
  };
}