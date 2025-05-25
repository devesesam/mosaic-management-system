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
      const workers = await getWorkers();
      set({ workers, loading: false, error: null });
    } catch (error) {
      console.error('WorkerStore: Error fetching workers:', error);
      set({ 
        error: 'Failed to fetch workers',
        loading: false,
        workers: [] 
      });
      throw error;
    }
  },
  
  addWorker: async (workerData) => {
    set({ loading: true, error: null });
    
    try {
      const newWorker = await createWorker(workerData);
      
      set((state) => ({ 
        workers: [...state.workers, newWorker],
        loading: false,
        error: null
      }));
      
      await get().fetchWorkers(); // Refresh worker list
      return newWorker;
    } catch (error) {
      console.error('WorkerStore: Error adding worker:', error);
      set({ 
        error: 'Failed to add worker', 
        loading: false 
      });
      throw error;
    }
  },

  deleteWorker: async (id: string) => {
    set({ loading: true, error: null });
    
    try {
      await deleteWorker(id);
      set((state) => ({
        workers: state.workers.filter((worker) => worker.id !== id),
        loading: false,
        error: null
      }));
      await get().fetchWorkers(); // Refresh worker list
    } catch (error) {
      console.error('WorkerStore: Error deleting worker:', error);
      set({
        error: 'Failed to delete worker',
        loading: false
      });
      throw error;
    }
  }
}));