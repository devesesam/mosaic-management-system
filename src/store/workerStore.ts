import { create } from 'zustand';
import { createWorker, getWorkers, deleteWorker } from '../lib/supabase';
import { Worker } from '../types';
import { useJobStore } from './jobStore';
import toast from 'react-hot-toast';

interface WorkerState {
  workers: Worker[];
  loading: boolean;
  error: string | null;
  fetchWorkers: () => Promise<void>;
  addWorker: (worker: Omit<Worker, 'id' | 'created_at'>) => Promise<Worker>;
  deleteWorker: (id: string) => Promise<void>;
}

export const useWorkerStore = create<WorkerState>((set, get) => ({
  workers: [],
  loading: false,
  error: null,
  
  fetchWorkers: async () => {
    set({ loading: true, error: null });
    
    try {
      console.log('Fetching workers from database...');
      const workers = await getWorkers();
      
      // Log worker data for debugging
      if (workers.length === 0) {
        console.warn('⚠️ No workers returned from database!');
        set({ 
          error: 'No workers found. Please check database connection.', 
          loading: false 
        });
      } else {
        console.log(`✓ Successfully fetched ${workers.length} workers`);
        set({ workers, loading: false, error: null });
      }
    } catch (error) {
      console.error('Error fetching workers:', error);
      set({ 
        error: 'Failed to fetch workers. Please check your connection and try again.', 
        loading: false 
      });
      // Keep existing workers in state to avoid UI flashing empty
      toast.error('Error loading workers - please try refreshing the page');
    }
  },
  
  addWorker: async (workerData) => {
    set({ loading: true, error: null });
    
    try {
      console.log('Adding worker:', workerData);
      const newWorker = await createWorker(workerData);
      console.log('Worker added successfully:', newWorker);
      set((state) => ({ 
        workers: [...state.workers, newWorker],
        loading: false,
        error: null
      }));
      toast.success('Worker added successfully');
      return newWorker;
    } catch (error) {
      console.error('Error adding worker:', error);
      set({ 
        error: 'Failed to add worker', 
        loading: false 
      });
      toast.error('Failed to add worker');
      throw error;
    }
  },

  deleteWorker: async (id: string) => {
    set({ loading: true, error: null });
    
    try {
      console.log('Deleting worker:', id);
      await deleteWorker(id);
      // Update jobs store to unassign jobs
      useJobStore.getState().unassignWorkerJobs(id);
      // Update workers store
      set((state) => ({
        workers: state.workers.filter((worker) => worker.id !== id),
        loading: false,
        error: null
      }));
      console.log('Worker deleted successfully');
      toast.success('Worker deleted successfully');
    } catch (error) {
      console.error('Error deleting worker:', error);
      // If deletion fails, refresh the workers list to ensure sync
      try {
        const workers = await getWorkers();
        set({ 
          workers,
          error: 'Failed to delete worker', 
          loading: false 
        });
      } catch (refreshError) {
        set({
          error: 'Failed to delete worker and refresh data',
          loading: false
        });
      }
      toast.error('Failed to delete worker');
      throw error;
    }
  }
}));