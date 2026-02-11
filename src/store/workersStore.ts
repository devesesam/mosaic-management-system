import { create } from 'zustand';
import { Worker } from '../types';
import toast from 'react-hot-toast';
import { logger } from '../utils/logger';

interface WorkerState {
  workers: Worker[];
  loading: boolean;
  error: string | null;
  fetchWorkers: () => Promise<void>;
  addWorker: (worker: Omit<Worker, 'id' | 'created_at'>) => Promise<Worker>;
  updateWorker: (id: string, updates: Partial<Omit<Worker, 'id' | 'created_at'>>) => Promise<Worker>;
  deleteWorker: (id: string) => Promise<void>;
  isLoading: boolean;
}

export const useWorkerStore = create<WorkerState>((set, get) => ({
  workers: [],
  loading: false,
  error: null,
  isLoading: false,
  
  fetchWorkers: async () => {
    logger.debug('workerStore: Calling fetchWorkers() - using edge function');
    set({ loading: true, error: null, isLoading: true });
    
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const apiUrl = `${supabaseUrl}/functions/v1/get-workers`;
      
      logger.debug('workerStore: Fetching workers from edge function:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      logger.debug('workerStore: Workers response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      logger.debug('workerStore: Workers response:', data);
      
      if (data.success && data.data) {
        const workers = data.data;
        logger.debug('workerStore: Fetched', workers.length, 'workers');
        set({ workers, loading: false, error: null, isLoading: false });
      } else {
        throw new Error(data.error || 'Failed to fetch workers');
      }
    } catch (error) {
      logger.error('WorkerStore: Error fetching workers:', error);
      
      // Create a user-friendly error message
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to fetch workers - check your network connection';
        
      set({ error: errorMessage, loading: false, isLoading: false });
      toast.error(errorMessage);
    }
  },
  
  addWorker: async (workerData) => {
    set({ loading: true, error: null, isLoading: true });
    
    try {
      logger.debug('workerStore: Adding worker:', workerData);
      
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const apiUrl = `${supabaseUrl}/functions/v1/add-worker`;
      
      logger.debug('workerStore: Adding worker via edge function:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(workerData)
      });

      logger.debug('workerStore: Add worker response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      logger.debug('workerStore: Add worker response:', data);
      
      if (data.success && data.data) {
        const newWorker = data.data;
        logger.debug('workerStore: Worker created successfully:', newWorker.id);
        
        // Update local state
        set((state) => ({ 
          workers: [...state.workers, newWorker],
          loading: false,
          error: null,
          isLoading: false
        }));
        
        toast.success('Worker added successfully');

        // Optimistic update - trust local state, no refetch needed
        return newWorker;
      } else {
        throw new Error(data.error || 'Failed to create worker');
      }
    } catch (error) {
      logger.error('WorkerStore: Error adding worker:', error);

      // Create a user-friendly error message
      const errorMessage = error instanceof Error
        ? error.message
        : 'Failed to add worker - check your network connection';

      set({ error: errorMessage, loading: false, isLoading: false });
      toast.error(errorMessage);
      throw error;
    }
  },

  updateWorker: async (id: string, updates: Partial<Omit<Worker, 'id' | 'created_at'>>) => {
    set({ loading: true, error: null, isLoading: true });

    try {
      logger.debug('workerStore: Updating worker:', id, updates);

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const apiUrl = `${supabaseUrl}/functions/v1/update-worker`;

      logger.debug('workerStore: Updating worker via edge function:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, updates })
      });

      logger.debug('workerStore: Update worker response status:', response.status);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      logger.debug('workerStore: Update worker response:', data);

      if (data.success && data.data) {
        const updatedWorker = data.data;
        logger.debug('workerStore: Worker updated successfully:', updatedWorker.id);

        // Update local state
        set((state) => ({
          workers: state.workers.map((worker) =>
            worker.id === id ? updatedWorker : worker
          ),
          loading: false,
          error: null,
          isLoading: false
        }));

        toast.success('Worker updated successfully');

        return updatedWorker;
      } else {
        throw new Error(data.error || 'Failed to update worker');
      }
    } catch (error) {
      logger.error('WorkerStore: Error updating worker:', error);

      // Create a user-friendly error message
      const errorMessage = error instanceof Error
        ? error.message
        : 'Failed to update worker - check your network connection';

      set({ error: errorMessage, loading: false, isLoading: false });
      toast.error(errorMessage);
      throw error;
    }
  },

  deleteWorker: async (id: string) => {
    set({ loading: true, error: null, isLoading: true });
    
    try {
      logger.debug('workerStore: Deleting worker:', id);
      
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const apiUrl = `${supabaseUrl}/functions/v1/delete-worker/${id}`;
      
      logger.debug('workerStore: Deleting worker via edge function:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      logger.debug('workerStore: Delete worker response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      logger.debug('workerStore: Delete worker response:', data);
      
      if (data.success) {
        logger.debug('workerStore: Worker deleted successfully:', id);
        
        // Update local state
        set((state) => ({
          workers: state.workers.filter((worker) => worker.id !== id),
          loading: false,
          error: null,
          isLoading: false
        }));
        
        toast.success('Worker deleted successfully');

        // Optimistic update - trust local state, no refetch needed
      } else {
        throw new Error(data.error || 'Failed to delete worker');
      }
    } catch (error) {
      logger.error('WorkerStore: Error deleting worker:', error);
      
      // Create a user-friendly error message
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to delete worker - check your network connection';
        
      set({ error: errorMessage, loading: false, isLoading: false });
      toast.error(errorMessage);
      throw error;
    }
  }
}));