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
  unassignWorkerJobs: (workerId: string) => void;
}

export const useJobStore = create<JobState>((set, get) => ({
  jobs: [],
  loading: false,
  error: null,
  selectedJob: null,
  
  fetchJobs: async () => {
    set({ loading: true, error: null });
    
    try {
      // Direct call with minimal processing
      const jobs = await getJobs();
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
      set((state) => ({ 
        jobs: [newJob, ...state.jobs],
        loading: false,
        error: null
      }));
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
      
      // Completely refresh job list to ensure consistency
      const allJobs = await getJobs();
      
      set((state) => ({
        jobs: allJobs,
        loading: false,
        error: null
      }));
      
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
      
      // Completely refresh job list to ensure consistency
      const allJobs = await getJobs();
      
      set((state) => ({
        jobs: allJobs,
        loading: false,
        error: null
      }));
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

  unassignWorkerJobs: (workerId) => {
    set((state) => ({
      jobs: state.jobs.map(job => 
        job.worker_id === workerId 
          ? { ...job, worker_id: null, start_date: null, end_date: null }
          : job
      )
    }));
  }
}));