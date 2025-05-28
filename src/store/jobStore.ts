import { create } from 'zustand';
import { createJob, getJobs, updateJob, deleteJob } from '../lib/supabase';
import { Job } from '../types';
import toast from 'react-hot-toast';

interface JobState {
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
}

export const useJobStore = create<JobState>((set, get) => ({
  jobs: [],
  loading: false,
  error: null,
  selectedJob: null,
  
  fetchJobs: async () => {
    set({ loading: true, error: null });
    console.log('jobStore: Fetching jobs');
    
    try {
      const jobs = await getJobs();
      console.log('jobStore: Fetched', jobs.length, 'jobs');
      set({ jobs, loading: false, error: null });
    } catch (error) {
      console.error('Error fetching jobs:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch jobs', 
        loading: false 
      });
    }
  },
  
  addJob: async (jobData) => {
    set({ loading: true, error: null });
    
    try {
      const newJob = await createJob(jobData);
      
      // Update local state immediately
      set((state) => ({ 
        jobs: [newJob, ...state.jobs],
        loading: false,
        error: null
      }));
      
      // Then refresh all jobs to ensure consistency
      get().fetchJobs();
      
      return newJob;
    } catch (error) {
      console.error('Error adding job:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to add job', 
        loading: false 
      });
      throw error;
    }
  },
  
  updateJob: async (id, updates) => {
    set({ loading: true, error: null });
    
    try {
      const updatedJob = await updateJob(id, updates);
      
      // Update local state immediately
      set((state) => ({
        jobs: state.jobs.map(job => job.id === id ? updatedJob : job),
        loading: false,
        error: null
      }));
      
      // Then refresh all jobs to ensure consistency
      get().fetchJobs();
      
      return updatedJob;
    } catch (error) {
      console.error('Error updating job:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to update job', 
        loading: false 
      });
      throw error;
    }
  },

  deleteJob: async (id) => {
    set({ loading: true, error: null });
    
    try {
      await deleteJob(id);
      
      // Update local state
      set((state) => ({
        jobs: state.jobs.filter(job => job.id !== id),
        loading: false,
        error: null
      }));
      
      // Then refresh all jobs to ensure consistency
      get().fetchJobs();
    } catch (error) {
      console.error('Error deleting job:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to delete job', 
        loading: false 
      });
      throw error;
    }
  },
  
  setSelectedJob: (job) => {
    set({ selectedJob: job });
  },

  unassignWorkerJobs: async (workerId) => {
    const state = get();
    const jobsToUpdate = state.jobs.filter(job => job.worker_id === workerId);
    
    console.log('jobStore: Unassigning', jobsToUpdate.length, 'jobs from worker', workerId);
    
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