import React, { useState, useEffect, useCallback } from 'react';
import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  addWeeks, 
  subWeeks,
  parseISO,
  addDays,
  differenceInDays,
  isSameDay
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Job, Worker } from '../../types';
import CalendarGrid from './CalendarGrid';
import UnscheduledPanel from './UnscheduledPanel';
import { useJobsStore } from '../../store/jobsStore';
import { useWorkerStore } from '../../store/workersStore';
import { useAuth } from '../../context/AuthContext';
import JobForm from '../jobs/JobForm';
import WorkerForm from '../workers/WorkerForm';
import toast from 'react-hot-toast';

interface WeekViewProps {
  readOnly?: boolean;
}

const WeekView: React.FC<WeekViewProps> = ({ readOnly = false }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isJobFormOpen, setIsJobFormOpen] = useState(false);
  const [isWorkerFormOpen, setIsWorkerFormOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  
  // Use stores for data access
  const { 
    jobs, 
    loading: jobsLoading, 
    error: jobsError, 
    fetchJobs,
    addJob,
    updateJob,
    deleteJob
  } = useJobsStore();
  
  const { 
    workers, 
    loading: workersLoading, 
    error: workersError, 
    fetchWorkers,
    addWorker
  } = useWorkerStore();

  const { user, currentWorker } = useAuth();
  
  // Get start and end of week
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  
  // Generate days of week
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
  
  // Handle week navigation
  const prevWeek = () => setCurrentDate(subWeeks(currentDate, 1));
  const nextWeek = () => setCurrentDate(addWeeks(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());
  
  // Fetch data when component mounts
  useEffect(() => {
    console.log('WeekView: Initial data load');
    fetchJobs();
    fetchWorkers();
  }, [fetchJobs, fetchWorkers]);

  // Show toast notifications for loading states
  useEffect(() => {
    if (jobsLoading) {
      toast.loading('Updating jobs...', { id: 'jobs-loading' });
    } else {
      toast.dismiss('jobs-loading');
    }
  }, [jobsLoading]);

  useEffect(() => {
    if (workersLoading) {
      toast.loading('Updating workers...', { id: 'workers-loading' });
    } else {
      toast.dismiss('workers-loading');
    }
  }, [workersLoading]);
  
  // Debug log jobs data
  useEffect(() => {
    if (jobs.length > 0) {
      console.log('WeekView: Jobs loaded:', jobs.length);
    }
  }, [jobs]);
  
  // Debug log the workers data
  useEffect(() => {
    if (workers.length > 0) {
      console.log('WeekView: Workers loaded:', workers.length);
    }
  }, [workers]);
  
  // Get unscheduled jobs - filter for read-only mode
  const unscheduledJobs = React.useMemo(() => {
    const baseUnscheduled = jobs.filter(job => !job.worker_id || !job.start_date);
    
    if (readOnly && currentWorker) {
      // In read-only mode, show jobs that are either:
      // 1. Completely unassigned (no worker, no date)
      // 2. Assigned to current worker (primary or secondary) but no date
      return jobs.filter(job => 
        (!job.start_date && !job.worker_id && (!job.secondary_worker_ids || job.secondary_worker_ids.length === 0)) || 
        (!job.start_date && (
          job.worker_id === currentWorker.id || 
          (job.secondary_worker_ids && job.secondary_worker_ids.includes(currentWorker.id))
        ))
      );
    }
    
    return baseUnscheduled;
  }, [jobs, readOnly, currentWorker]);
  
  // Get jobs for a worker on a specific day - updated to include secondary workers
  const getWorkerDayJobs = useCallback((workerId: string | null, day: Date) => {
    const allJobs = jobs.filter(job => {
      // Skip if no start date
      if (!job.start_date) return false;
      
      // Check if the job is assigned to this worker (primary or secondary)
      let isAssignedToWorker = false;
      
      if (workerId === null) {
        // For unassigned row, only show jobs with no primary worker AND no secondary workers
        isAssignedToWorker = !job.worker_id && (!job.secondary_worker_ids || job.secondary_worker_ids.length === 0);
      } else {
        // For specific worker rows, check both primary and secondary assignments
        isAssignedToWorker = job.worker_id === workerId || 
          (job.secondary_worker_ids && job.secondary_worker_ids.includes(workerId));
      }
      
      if (!isAssignedToWorker) return false;
      
      try {
        const jobStart = parseISO(job.start_date);
        
        // Handle jobs with end dates (multi-day jobs)
        if (job.end_date) {
          const jobEnd = parseISO(job.end_date);
          
          // Check if day is within the job's date range
          return (
            (day >= jobStart && day <= jobEnd) || 
            format(day, 'yyyy-MM-dd') === format(jobStart, 'yyyy-MM-dd') || 
            format(day, 'yyyy-MM-dd') === format(jobEnd, 'yyyy-MM-dd')
          );
        }
        
        // For single-day jobs, just check the start date
        return format(day, 'yyyy-MM-dd') === format(jobStart, 'yyyy-MM-dd');
      } catch (error) {
        console.error('Error parsing job dates:', error, job);
        return false;
      }
    });

    // In read-only mode, filter to only show jobs where current worker is involved
    if (readOnly && currentWorker) {
      return allJobs.filter(job => 
        job.worker_id === currentWorker.id || 
        (job.secondary_worker_ids && job.secondary_worker_ids.includes(currentWorker.id))
      );
    }
    
    return allJobs;
  }, [jobs, readOnly, currentWorker]);
  
  const handleSubmitJob = async (jobData: Omit<Job, 'id' | 'created_at'>) => {
    if (readOnly) {
      toast.error('Cannot modify jobs in read-only mode');
      return;
    }
    
    try {
      if (selectedJob) {
        await updateJob(selectedJob.id, jobData);
      } else {
        await addJob(jobData);
      }
      setIsJobFormOpen(false);
      setSelectedJob(null);
    } catch (error) {
      console.error('Error saving job:', error);
    }
  };

  const handleDeleteJob = async (id: string) => {
    if (readOnly) {
      toast.error('Cannot delete jobs in read-only mode');
      return;
    }
    
    try {
      await deleteJob(id);
      setIsJobFormOpen(false);
      setSelectedJob(null);
    } catch (error) {
      console.error('Error deleting job:', error);
    }
  };

  const handleSubmitWorker = async (workerData: Omit<Worker, 'id' | 'created_at'>) => {
    if (readOnly) {
      toast.error('Cannot add workers in read-only mode');
      return;
    }
    
    try {
      console.log('WeekView: Submitting worker:', workerData);
      
      // Wait for the worker to be added
      await addWorker(workerData);
      
      console.log('WeekView: Worker added successfully');
      setIsWorkerFormOpen(false);
    } catch (error) {
      console.error('WeekView: Error adding worker:', error);
    }
  };
  
  const handleJobDrop = async (job: Job, workerId: string | null, date: Date | null) => {
    if (readOnly) {
      toast.error('Cannot move jobs in read-only mode');
      return;
    }
    
    try {
      let updates: Partial<Job> = {
        worker_id: workerId,
        start_date: date ? date.toISOString() : null
      };

      // Calculate end date to preserve the job's duration
      if (date && job.start_date && job.end_date) {
        try {
          const originalStartDate = parseISO(job.start_date);
          const originalEndDate = parseISO(job.end_date);
          
          // Calculate the duration in days (inclusive)
          // For calendar purposes, if start and end are the same day, it's 1 day
          // If end is 1 day after start, it's 2 days, etc.
          let durationInDays: number;
          
          if (isSameDay(originalStartDate, originalEndDate)) {
            // Single day job
            durationInDays = 1;
          } else {
            // Multi-day job - calculate the span
            durationInDays = differenceInDays(originalEndDate, originalStartDate) + 1;
          }
          
          // Set the new end date to preserve the duration
          const newEndDate = addDays(date, durationInDays - 1);
          updates.end_date = newEndDate.toISOString();
          
          console.log('WeekView: Preserving job duration:', {
            job_id: job.id,
            original_start: job.start_date,
            original_end: job.end_date,
            original_duration_days: durationInDays,
            new_start: date.toISOString(),
            new_end: newEndDate.toISOString()
          });
        } catch (error) {
          console.error('Error calculating job duration:', error);
          // Fallback to single-day job
          updates.end_date = date.toISOString();
        }
      } else if (date) {
        // New job or job without existing dates - make it a single-day job
        updates.end_date = date.toISOString();
      } else {
        // Unscheduling the job
        updates.end_date = null;
      }
      
      console.log('WeekView: Updating job with drop info:', {
        job_id: job.id,
        updates
      });
      
      await updateJob(job.id, updates);
    } catch (error) {
      console.error('Error updating job:', error);
      toast.error('Failed to move job. Please try again.');
    }
  };

  const handleJobResize = async (job: Job, days: number) => {
    if (readOnly) {
      toast.error('Cannot resize jobs in read-only mode');
      return;
    }
    
    try {
      console.log('WeekView: Resize started with:', {
        job_id: job.id,
        days,
        days_type: typeof days,
        start_date: job.start_date
      });

      // Validate the days parameter
      if (typeof days !== 'number' || isNaN(days) || days < 1) {
        console.error('Invalid days parameter for job resize:', days);
        toast.error('Cannot resize job: invalid duration');
        return;
      }

      if (!job.start_date) {
        console.error('Cannot resize job without start_date');
        toast.error('Cannot resize job: no start date');
        return;
      }
      
      const startDate = parseISO(job.start_date);
      
      // Check if the parsed start date is valid
      if (isNaN(startDate.getTime())) {
        console.error('Invalid start_date for job:', job.start_date);
        toast.error('Cannot resize job: invalid start date');
        return;
      }
      
      const newEndDate = addDays(startDate, days - 1);
      
      // Check if the calculated end date is valid
      if (isNaN(newEndDate.getTime())) {
        console.error('Invalid calculated end date:', {
          start_date: job.start_date,
          days,
          calculation: `addDays(${startDate}, ${days - 1})`
        });
        toast.error('Cannot resize job: invalid end date calculation');
        return;
      }
      
      console.log('WeekView: Resizing job:', {
        job_id: job.id,
        days,
        start_date: job.start_date,
        parsed_start_date: startDate.toISOString(),
        new_end_date: newEndDate.toISOString()
      });
      
      await updateJob(job.id, {
        end_date: newEndDate.toISOString()
      });
    } catch (error) {
      console.error('Error resizing job:', error);
      toast.error('Failed to resize job. Please try again.');
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Week navigation header */}
      <div className="flex items-center justify-between p-2 bg-white border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <button
            onClick={prevWeek}
            className="p-1 rounded-full hover:bg-gray-200 transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-gray-600" />
          </button>
          <h2 className="text-lg font-semibold text-gray-800">
            {format(weekStart, 'MMMM d')} - {format(weekEnd, 'MMMM d, yyyy')}
          </h2>
          <button
            onClick={nextWeek}
            className="p-1 rounded-full hover:bg-gray-200 transition-colors"
          >
            <ChevronRight className="h-5 w-5 text-gray-600" />
          </button>
        </div>
        
        <button
          onClick={goToToday}
          className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
        >
          Today
        </button>
      </div>
      
      {/* Error messages - keep these but make them less prominent */}
      {workersError && (
        <div className="px-4 py-2 bg-red-50 border-b border-red-100 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-red-700">Error loading workers: {workersError}</span>
            <button 
              onClick={() => {
                setIsRetrying(true);
                fetchWorkers();
                setTimeout(() => setIsRetrying(false), 1000);
              }}
              className="ml-2 px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200 flex items-center"
              disabled={isRetrying}
            >
              {isRetrying ? (
                <>
                  <div className="w-3 h-3 mr-1 border-t-2 border-b-2 border-red-700 rounded-full animate-spin"></div>
                  Retrying...
                </>
              ) : (
                'Retry'
              )}
            </button>
          </div>
        </div>
      )}
      
      {jobsError && (
        <div className="px-4 py-2 bg-red-50 border-b border-red-100 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-red-700">Error loading jobs: {jobsError}</span>
            <button 
              onClick={() => {
                setIsRetrying(true);
                fetchJobs();
                setTimeout(() => setIsRetrying(false), 1000);
              }}
              className="ml-2 px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200 flex items-center"
              disabled={isRetrying}
            >
              {isRetrying ? (
                <>
                  <div className="w-3 h-3 mr-1 border-t-2 border-b-2 border-red-700 rounded-full animate-spin"></div>
                  Retrying...
                </>
              ) : (
                'Retry'
              )}
            </button>
          </div>
        </div>
      )}
      
      {/* Info messages - keep these as they're informational */}
      {!workersLoading && !workersError && workers.length === 0 && (
        <div className="px-4 py-2 bg-yellow-50 border-b border-yellow-100 text-sm">
          <span className="text-yellow-700">No workers found. Add a worker to start scheduling jobs.</span>
        </div>
      )}
      
      {!jobsLoading && !jobsError && jobs.length === 0 && (
        <div className="px-4 py-2 bg-yellow-50 border-b border-yellow-100 text-sm">
          <span className="text-yellow-700">No jobs found. Add jobs to start scheduling.</span>
        </div>
      )}
      
      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Calendar grid */}
        <div className="flex-1 overflow-auto min-w-0">
          <CalendarGrid 
            days={weekDays}
            workers={workers}
            getWorkerDayJobs={getWorkerDayJobs}
            onJobDrop={handleJobDrop}
            onJobClick={(job) => {
              setSelectedJob(job);
              setIsJobFormOpen(true);
            }}
            onJobResize={handleJobResize}
            onNewWorker={() => setIsWorkerFormOpen(true)}
            readOnly={readOnly}
          />
        </div>
        
        {/* Fixed-width unscheduled jobs panel - only show for edit mode */}
        {!readOnly && (
          <UnscheduledPanel 
            jobs={unscheduledJobs}
            onJobDrop={handleJobDrop}
            onJobClick={(job) => {
              setSelectedJob(job);
              setIsJobFormOpen(true);
            }}
            readOnly={readOnly}
          />
        )}
      </div>
      
      {/* Job form modal */}
      {isJobFormOpen && (
        <JobForm
          onClose={() => {
            setIsJobFormOpen(false);
            setSelectedJob(null);
          }}
          onSubmit={handleSubmitJob}
          onDelete={handleDeleteJob}
          initialJob={selectedJob || undefined}
          readOnly={readOnly}
        />
      )}

      {/* Worker form modal */}
      {isWorkerFormOpen && (
        <WorkerForm
          onClose={() => setIsWorkerFormOpen(false)}
          onSubmit={handleSubmitWorker}
          readOnly={readOnly}
        />
      )}
    </div>
  );
};

export default WeekView;