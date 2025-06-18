import { create } from 'zustand';
import { Worker } from '../types';
import toast from 'react-hot-toast';

interface WorkerState {
  workers: Worker[];
  loading: boolean;
  error: string | null;
  fetchWorkers: () => Promise<void>;
  addWorker: (worker: Omit<Worker, 'id' | 'created_at'>) => Promise<Worker>;
  deleteWorker: (id: string) => Promise<void>;
  isLoading: boolean;
}

export const useWorkerStore = create<WorkerState>((set, get) => ({
  workers: [],
  loading: false,
  error: null,
  isLoading: false,
  
  fetchWorkers: async () => {
    console.log('workerStore: Calling fetchWorkers() - using edge function');
    set({ loading: true, error: null, isLoading: true });
    
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const apiUrl = `${supabaseUrl}/functions/v1/get-workers`;
      
      console.log('workerStore: Fetching workers from edge function:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('workerStore: Workers response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('workerStore: Workers response:', data);
      
      if (data.success && data.data) {
        const workers = data.data;
        console.log('workerStore: Fetched', workers.length, 'workers');
        set({ workers, loading: false, error: null, isLoading: false });
      } else {
        throw new Error(data.error || 'Failed to fetch workers');
      }
    } catch (error) {
      console.error('WorkerStore: Error fetching workers:', error);
      
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
      console.log('workerStore: Adding worker:', workerData);
      
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const apiUrl = `${supabaseUrl}/functions/v1/add-worker`;
      
      console.log('workerStore: Adding worker via edge function:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(workerData)
      });

      console.log('workerStore: Add worker response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('workerStore: Add worker response:', data);
      
      if (data.success && data.data) {
        const newWorker = data.data;
        console.log('workerStore: Worker created successfully:', newWorker.id);
        
        // Update local state
        set((state) => ({ 
          workers: [...state.workers, newWorker],
          loading: false,
          error: null,
          isLoading: false
        }));
        
        toast.success('Worker added successfully');
        
        // Refresh worker list to ensure consistency
        await get().fetchWorkers();
        
        return newWorker;
      } else {
        throw new Error(data.error || 'Failed to create worker');
      }
    } catch (error) {
      console.error('WorkerStore: Error adding worker:', error);
      
      // Create a user-friendly error message
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to add worker - check your network connection';
        
      set({ error: errorMessage, loading: false, isLoading: false });
      toast.error(errorMessage);
      throw error;
    }
  },

  deleteWorker: async (id: string) => {
    set({ loading: true, error: null, isLoading: true });
    
    try {
      console.log('workerStore: Deleting worker:', id);
      
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const apiUrl = `${supabaseUrl}/functions/v1/delete-worker/${id}`;
      
      console.log('workerStore: Deleting worker via edge function:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('workerStore: Delete worker response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('workerStore: Delete worker response:', data);
      
      if (data.success) {
        console.log('workerStore: Worker deleted successfully:', id);
        
        // Update local state
        set((state) => ({
          workers: state.workers.filter((worker) => worker.id !== id),
          loading: false,
          error: null,
          isLoading: false
        }));
        
        toast.success('Worker deleted successfully');
        
        // Refresh worker list to ensure consistency
        await get().fetchWorkers();
      } else {
        throw new Error(data.error || 'Failed to delete worker');
      }
    } catch (error) {
      console.error('WorkerStore: Error deleting worker:', error);
      
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