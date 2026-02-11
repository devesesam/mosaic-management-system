import { create } from 'zustand';
import { Job } from '../types';
import toast from 'react-hot-toast';
import { logger } from '../utils/logger';

interface JobsState {
  jobs: Job[];
  loading: boolean;
  error: string | null;
  selectedJob: Job | null;
  fetchJobs: () => Promise<void>;
  addJob: (job: Omit<Job, 'id' | 'created_at'>) => Promise<Job>;
  updateJob: (id: string, updates: Partial<Job>) => Promise<Job>;
  deleteJob: (id: string) => Promise<void>;
  setSelectedJob: (job: Job | null) => void;
  unassignWorkerJobs: (workerId: string) => Promise<void>;
  isLoading: boolean;
}

export const useJobsStore = create<JobsState>((set, get) => ({
  jobs: [],
  loading: false,
  error: null,
  selectedJob: null,
  isLoading: false,
  
  fetchJobs: async () => {
    set({ loading: true, error: null, isLoading: true });
    logger.debug('jobsStore: Fetching jobs - using edge function');
    
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const apiUrl = `${supabaseUrl}/functions/v1/get-jobs`;
      
      logger.debug('jobsStore: Fetching jobs from edge function:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      logger.debug('jobsStore: Jobs response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      logger.debug('jobsStore: Jobs response:', data);
      
      if (data.success && data.data) {
        const jobs = data.data;
        logger.debug('jobsStore: Fetched', jobs.length, 'jobs');
        set({ jobs, loading: false, error: null, isLoading: false });
      } else {
        throw new Error(data.error || 'Failed to fetch jobs');
      }
    } catch (error) {
      logger.error('jobsStore: Error fetching jobs:', error);
      
      // Create a user-friendly error message
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to fetch jobs - check your network connection';
        
      set({ error: errorMessage, loading: false, isLoading: false });
      toast.error(errorMessage);
    }
  },
  
  addJob: async (jobData) => {
    set({ loading: true, error: null, isLoading: true });
    logger.debug('jobsStore: Adding job:', jobData);
    
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const apiUrl = `${supabaseUrl}/functions/v1/add-job`;
      
      logger.debug('jobsStore: Adding job via edge function:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(jobData)
      });

      logger.debug('jobsStore: Add job response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      logger.debug('jobsStore: Add job response:', data);
      
      if (data.success && data.data) {
        const newJob = data.data;
        logger.debug('jobsStore: Job created successfully:', newJob.id);
        
        // Update local state immediately
        set((state) => ({ 
          jobs: [newJob, ...state.jobs],
          loading: false,
          error: null,
          isLoading: false
        }));
        
        toast.success('Job created successfully');

        // Optimistic update - trust local state, no refetch needed
        return newJob;
      } else {
        throw new Error(data.error || 'Failed to create job');
      }
    } catch (error) {
      logger.error('jobsStore: Error adding job:', error);
      
      // Create a user-friendly error message
      let errorMessage = 'Failed to add job - please try again';
      
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          errorMessage = 'Request timed out - please check your connection and try again';
        } else if (error.message.includes('network')) {
          errorMessage = 'Network error - please check your connection';
        } else {
          errorMessage = error.message;
        }
      }
        
      set({ error: errorMessage, loading: false, isLoading: false });
      toast.error(errorMessage);
      throw error;
    }
  },
  
  updateJob: async (id, updates) => {
    set({ loading: true, error: null, isLoading: true });
    logger.debug('jobsStore: Updating job:', id, updates);
    
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const apiUrl = `${supabaseUrl}/functions/v1/update-job`;
      
      logger.debug('jobsStore: Updating job via edge function:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, updates })
      });

      logger.debug('jobsStore: Update job response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      logger.debug('jobsStore: Update job response:', data);
      
      if (data.success && data.data) {
        const updatedJob = data.data;
        logger.debug('jobsStore: Job updated successfully:', id);
        
        // Update local state immediately
        set((state) => ({
          jobs: state.jobs.map(job => job.id === id ? updatedJob : job),
          loading: false,
          error: null,
          isLoading: false
        }));
        
        toast.success('Job updated successfully');

        // Optimistic update - trust local state, no refetch needed
        return updatedJob;
      } else {
        throw new Error(data.error || 'Failed to update job');
      }
    } catch (error) {
      logger.error('jobsStore: Error updating job:', error);
      
      // Create a user-friendly error message
      let errorMessage = 'Failed to update job - please try again';
      
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          errorMessage = 'Request timed out - please check your connection and try again';
        } else if (error.message.includes('network')) {
          errorMessage = 'Network error - please check your connection';
        } else {
          errorMessage = error.message;
        }
      }
        
      set({ error: errorMessage, loading: false, isLoading: false });
      toast.error(errorMessage);
      throw error;
    }
  },

  deleteJob: async (id) => {
    set({ loading: true, error: null, isLoading: true });
    logger.debug('jobsStore: Deleting job:', id);
    
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const apiUrl = `${supabaseUrl}/functions/v1/delete-job/${id}`;
      
      logger.debug('jobsStore: Deleting job via edge function:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      logger.debug('jobsStore: Delete job response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      logger.debug('jobsStore: Delete job response:', data);
      
      if (data.success) {
        logger.debug('jobsStore: Job deleted successfully:', id);
        
        // Update local state
        set((state) => ({
          jobs: state.jobs.filter(job => job.id !== id),
          loading: false,
          error: null,
          isLoading: false
        }));
        
        toast.success('Job deleted successfully');

        // Optimistic update - trust local state, no refetch needed
      } else {
        throw new Error(data.error || 'Failed to delete job');
      }
    } catch (error) {
      logger.error('jobsStore: Error deleting job:', error);
      
      // Create a user-friendly error message
      let errorMessage = 'Failed to delete job - please try again';
      
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          errorMessage = 'Request timed out - please check your connection and try again';
        } else if (error.message.includes('network')) {
          errorMessage = 'Network error - please check your connection';
        } else {
          errorMessage = error.message;
        }
      }
        
      set({ error: errorMessage, loading: false, isLoading: false });
      toast.error(errorMessage);
      throw error;
    }
  },
  
  setSelectedJob: (job) => {
    set({ selectedJob: job });
  },

  unassignWorkerJobs: async (workerId) => {
    const state = get();
    const jobsToUpdate = state.jobs.filter(job => job.worker_id === workerId);
    
    logger.debug('jobsStore: Unassigning', jobsToUpdate.length, 'jobs from worker', workerId);
    
    // Update each job to unassign the worker
    for (const job of jobsToUpdate) {
      try {
        await get().updateJob(job.id, {
          worker_id: null,
          start_date: null,
          end_date: null
        });
      } catch (error) {
        logger.error(`Failed to unassign job ${job.id}:`, error);
      }
    }
    
    // Refresh jobs after unassigning
    await get().fetchJobs();
  }
}));