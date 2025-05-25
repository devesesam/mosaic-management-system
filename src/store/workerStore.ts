import { create } from 'zustand';
import { createWorker, getWorkers, deleteWorker } from '../lib/supabase';
import { Worker } from '../types';
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
      console.log('WorkerStore: Fetching workers from database...');
      const workers = await getWorkers();
      
      if (workers.length === 0) {
        console.warn('WorkerStore: ⚠️ No workers returned from database!');
        set({ 
          workers: [],
          error: 'No workers found. Please check database connection.', 
          loading: false 
        });
      } else {
        console.log(`WorkerStore: ✓ Successfully fetched ${workers.length} workers`);
        set({ workers, loading: false, error: null });
      }
    } catch (error) {
      console.error('WorkerStore: Error fetching workers:', error);
      set({ 
        error: 'Failed to fetch workers. Please check your connection and try again.', 
        loading: false,
        workers: [] // Clear workers on error
      });
      toast.error('Error loading workers - please try refreshing the page');
    }
  },
  
  addWorker: async (workerData) => {
    set({ loading: true, error: null });
    
    try {
      console.log('WorkerStore: Adding worker:', workerData);
      const newWorker = await createWorker(workerData);
      
      set((state) => ({ 
        workers: [...state.workers, newWorker],
        loading: false,
        error: null
      }));
      
      toast.success('Worker added successfully');
      return newWorker;
    } catch (error) {
      console.error('WorkerStore: Error adding worker:', error);
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
      console.log('WorkerStore: Deleting worker:', id);
      await deleteWorker(id);
      
      // Update workers store
      set((state) => ({
        workers: state.workers.filter((worker) => worker.id !== id),
        loading: false,
        error: null
      }));
      
      console.log('WorkerStore: Worker deleted successfully');
      toast.success('Worker deleted successfully');
    } catch (error) {
      console.error('WorkerStore: Error deleting worker:', error);
      
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
          loading: false,
          workers: [] // Clear workers on error
        });
      }
      
      toast.error('Failed to delete worker');
      throw error;
    }
  }
}));