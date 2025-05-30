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
    console.log('workerStore: Fetching workers');
    
    try {
      const workers = await getWorkers();
      console.log('workerStore: Fetched', workers.length, 'workers');
      set({ workers, loading: false, error: null });
    } catch (error) {
      console.error('WorkerStore: Error fetching workers:', error);
      
      // More specific error message
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to fetch workers - check your network connection and authentication';
        
      set({ error: errorMessage, loading: false });
      toast.error(errorMessage);
    }
  },
  
  addWorker: async (workerData) => {
    set({ loading: true, error: null });
    
    try {
      console.log('workerStore: Adding worker:', workerData);
      const newWorker = await createWorker(workerData);
      console.log('workerStore: Worker added:', newWorker);
      
      // Update local state
      set((state) => ({ 
        workers: [...state.workers, newWorker],
        loading: false,
        error: null
      }));
      
      // Refresh worker list to ensure consistency
      await get().fetchWorkers();
      
      return newWorker;
    } catch (error) {
      console.error('WorkerStore: Error adding worker:', error);
      
      // More specific error message
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to add worker - check your network connection and authentication';
        
      set({ error: errorMessage, loading: false });
      toast.error(errorMessage);
      throw error;
    }
  },

  deleteWorker: async (id: string) => {
    set({ loading: true, error: null });
    
    try {
      console.log('workerStore: Deleting worker:', id);
      await deleteWorker(id);
      
      // Update local state
      set((state) => ({
        workers: state.workers.filter((worker) => worker.id !== id),
        loading: false,
        error: null
      }));
      
      // Refresh worker list to ensure consistency
      await get().fetchWorkers();
    } catch (error) {
      console.error('WorkerStore: Error deleting worker:', error);
      
      // More specific error message
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to delete worker - check your network connection and authentication';
        
      set({ error: errorMessage, loading: false });
      toast.error(errorMessage);
      throw error;
    }
  }
}));