import { create } from 'zustand';
import { getAllJobs, createJob, updateJob, deleteJob } from '../api/jobsApi';
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
    set({ loading: true, error: null });
    console.log('jobsStore: Fetching jobs');
    
    try {
      const jobs = await getAllJobs();
      console.log('jobsStore: Fetched', jobs.length, 'jobs');
      set({ jobs, loading: false, error: null });
    } catch (error) {
      console.error('jobsStore: Error fetching jobs:', error);
      
      // Create a user-friendly error message
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to fetch jobs - check your network connection';
        
      set({ error: errorMessage, loading: false });
      toast.error(errorMessage);
    }
  },
  
  addJob: async (jobData) => {
    set({ loading: true, error: null, isLoading: true });
    console.log('jobsStore: Adding job:', jobData);
    
    try {
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout - job creation took too long')), 30000);
      });
      
      const newJob = await Promise.race([
        createJob(jobData),
        timeoutPromise
      ]);
      
      console.log('jobsStore: Job created successfully:', newJob.id);
      
      // Update local state immediately
      set((state) => ({ 
        jobs: [newJob, ...state.jobs],
        loading: false,
        error: null,
        isLoading: false
      }));
      
      // Then refresh all jobs to ensure consistency
      get().fetchJobs();
      
      return newJob;
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
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout - job update took too long')), 30000);
      });
      
      const updatedJob = await Promise.race([
        updateJob(id, updates),
        timeoutPromise
      ]);
      
      console.log('jobsStore: Job updated successfully:', id);
      
      // Update local state immediately
      set((state) => ({
        jobs: state.jobs.map(job => job.id === id ? updatedJob : job),
        loading: false,
        error: null,
        isLoading: false
      }));
      
      // Then refresh all jobs to ensure consistency
      get().fetchJobs();
      
      return updatedJob;
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
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout - job deletion took too long')), 30000);
      });
      
      await Promise.race([
        deleteJob(id),
        timeoutPromise
      ]);
      
      console.log('jobsStore: Job deleted successfully:', id);
      
      // Update local state
      set((state) => ({
        jobs: state.jobs.filter(job => job.id !== id),
        loading: false,
        error: null,
        isLoading: false
      }));
      
      // Then refresh all jobs to ensure consistency
      get().fetchJobs();
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
    
    for (const job of jobsToUpdate) {
      try {
        await updateJob(job.id, {
          worker_id: null,
          start_date: null,
          end_date: null
        });
      } catch (error) {
        console.error(`Failed to unassign job ${job.id}:`, error);
      }
    }
    
    // Refresh jobs after unassigning
    await get().fetchJobs();
  }
}));