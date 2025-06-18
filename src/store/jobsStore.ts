import { create } from 'zustand';
import { Job } from '../types';
import toast from 'react-hot-toast';

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
    console.log('jobsStore: Fetching jobs - using edge function');
    
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const apiUrl = `${supabaseUrl}/functions/v1/get-jobs`;
      
      console.log('jobsStore: Fetching jobs from edge function:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('jobsStore: Jobs response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('jobsStore: Jobs response:', data);
      
      if (data.success && data.data) {
        const jobs = data.data;
        console.log('jobsStore: Fetched', jobs.length, 'jobs');
        set({ jobs, loading: false, error: null, isLoading: false });
      } else {
        throw new Error(data.error || 'Failed to fetch jobs');
      }
    } catch (error) {
      console.error('jobsStore: Error fetching jobs:', error);
      
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
    console.log('jobsStore: Adding job:', jobData);
    
    try {
      // TODO: Implement add job edge function
      toast.success('Job creation functionality will be implemented soon');
      
      // Refresh all jobs to ensure consistency
      await get().fetchJobs();
      
      // Return a mock job for now
      return {
        id: 'mock-id',
        ...jobData,
        created_at: new Date().toISOString()
      } as Job;
    } catch (error) {
      console.error('jobsStore: Error adding job:', error);
      
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
    console.log('jobsStore: Updating job:', id, updates);
    
    try {
      // TODO: Implement update job edge function
      toast.success('Job update functionality will be implemented soon');
      
      // Refresh all jobs to ensure consistency
      await get().fetchJobs();
      
      // Return a mock updated job for now
      const currentJob = get().jobs.find(job => job.id === id);
      return {
        ...currentJob,
        ...updates,
        id
      } as Job;
    } catch (error) {
      console.error('jobsStore: Error updating job:', error);
      
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
    console.log('jobsStore: Deleting job:', id);
    
    try {
      // TODO: Implement delete job edge function
      toast.success('Job deletion functionality will be implemented soon');
      
      // Refresh all jobs to ensure consistency
      await get().fetchJobs();
    } catch (error) {
      console.error('jobsStore: Error deleting job:', error);
      
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
    
    console.log('jobsStore: Unassigning', jobsToUpdate.length, 'jobs from worker', workerId);
    
    // TODO: Implement unassign worker jobs edge function
    toast.success('Worker job unassignment functionality will be implemented soon');
    
    // Refresh jobs after unassigning
    await get().fetchJobs();
  }
}));