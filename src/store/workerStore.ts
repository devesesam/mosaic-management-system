import { create } from 'zustand';
import { createWorker, getWorkers, deleteWorker } from '../lib/supabase';
import { Worker } from '../types';
import { useJobStore } from './jobStore';

interface WorkerState {
  workers: Worker[];
  loading: boolean;
  error: string | null;
  fetchWorkers: () => Promise<void>;
  addWorker: (worker: Omit<Worker, 'id' | 'created_at'>) => Promise<Worker>;
  deleteWorker: (id: string) => Promise<void>;
}

export const useWorkerStore = create<WorkerState>((set) => ({
  workers: [],
  loading: false,
  error: null,
  
  fetchWorkers: async () => {
    set({ loading: true, error: null });
    
    try {
      const workers = await getWorkers();
      set({ workers, loading: false });
    } catch (error) {
      console.error('Error fetching workers:', error);
      set({ 
        error: 'Failed to fetch workers', 
        loading: false 
      });
    }
  },
  
  addWorker: async (workerData) => {
    set({ loading: true, error: null });
    
    try {
      const newWorker = await createWorker(workerData);
      set((state) => ({ 
        workers: [...state.workers, newWorker],
        loading: false 
      }));
      return newWorker;
    } catch (error) {
      console.error('Error adding worker:', error);
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
      // Update jobs store to unassign jobs
      useJobStore.getState().unassignWorkerJobs(id);
      // Update workers store
      set((state) => ({
        workers: state.workers.filter((worker) => worker.id !== id),
        loading: false
      }));
    } catch (error) {
      console.error('Error deleting worker:', error);
      // If deletion fails, refresh the workers list to ensure sync
      const workers = await getWorkers();
      set({ 
        workers,
        error: 'Failed to delete worker', 
        loading: false 
      });
      throw error;
    }
  }
}));