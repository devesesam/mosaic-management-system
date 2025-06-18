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
      
      // TODO: Implement add worker edge function
      // For now, just show success and refresh the list
      toast.success('Worker functionality will be implemented soon');
      
      // Refresh worker list to ensure consistency
      await get().fetchWorkers();
      
      // Return a mock worker for now
      return { 
        id: 'mock-id', 
        name: workerData.name, 
        email: workerData.email,
        phone: workerData.phone,
        role: workerData.role || 'admin',
        created_at: new Date().toISOString() 
      } as Worker;
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
      
      // TODO: Implement delete worker edge function
      toast.success('Worker deletion functionality will be implemented soon');
      
      // Refresh worker list to ensure consistency
      await get().fetchWorkers();
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