import React, { useState, useEffect } from 'react';
import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  addWeeks, 
  subWeeks,
  isSameDay,
  parseISO,
  addDays,
  differenceInDays,
  isWithinInterval,
  isBefore,
  isAfter
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Job, Worker } from '../../types';
import CalendarGrid from './CalendarGrid';
import UnscheduledPanel from './UnscheduledPanel';
import { useJobStore } from '../../store/jobStore';
import { useWorkerStore } from '../../store/workerStore';
import { useAuth } from '../../context/AuthContext';
import JobForm from '../jobs/JobForm';
import WorkerForm from '../workers/WorkerForm';
import toast from 'react-hot-toast';

interface WeekViewProps {
}

const WeekView: React.FC<WeekViewProps> = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isJobFormOpen, setIsJobFormOpen] = useState(false);
  const [isWorkerFormOpen, setIsWorkerFormOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  
  const { jobs, fetchJobs, addJob, updateJob, deleteJob } = useJobStore();
  const { workers, fetchWorkers, addWorker } = useWorkerStore();
  const { session } = useAuth();
  
  // Get start and end of week
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  
  // Generate days of week
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
  
  // Handle week navigation
  const prevWeek = () => setCurrentDate(subWeeks(currentDate, 1));
  const nextWeek = () => setCurrentDate(addWeeks(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());
  
  // Only fetch data when authenticated
  useEffect(() => {
    if (!session) {
      console.log('WeekView: No session, skipping data fetch');
      return;
    }
    
    console.log('WeekView: Session available, fetching data');
    fetchJobs();
    fetchWorkers();
  }, [session, fetchJobs, fetchWorkers]);
  
  // Debug log the jobs data
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
  
  // Get unscheduled jobs
  const unscheduledJobs = jobs.filter(job => !job.worker_id || !job.start_date);
  
  // Get jobs for a worker on a specific day
  const getWorkerDayJobs = (workerId: string | null, day: Date) => {
    return jobs.filter(job => {
      // Skip if worker doesn't match
      if (job.worker_id !== workerId) return false;
      
      // Skip if no start date
      if (!job.start_date) return false;
      
      try {
        const jobStart = parseISO(job.start_date);
        
        // Handle jobs with end dates (multi-day jobs)
        if (job.end_date) {
          const jobEnd = parseISO(job.end_date);
          return isWithinInterval(day, { start: jobStart, end: jobEnd }) || 
                 isSameDay(jobStart, day) || 
                 isSameDay(jobEnd, day);
        }
        
        // For single-day jobs, just check the start date
        return isSameDay(jobStart, day);
      } catch (error) {
        console.error('Error parsing job dates:', error, job);
        return false;
      }
    });
  };
  
  const handleSubmitJob = async (jobData: Omit<Job, 'id' | 'created_at'>) => {
    try {
      if (selectedJob) {
        await updateJob(selectedJob.id, jobData);
        toast.success('Job updated successfully');
      } else {
        await addJob(jobData);
        toast.success('Job created successfully');
      }
      setIsJobFormOpen(false);
      setSelectedJob(null);
    } catch (error) {
      toast.error('Failed to save job');
      console.error('Error saving job:', error);
    }
  };

  const handleDeleteJob = async (id: string) => {
    try {
      await deleteJob(id);
      toast.success('Job deleted successfully');
      setIsJobFormOpen(false);
      setSelectedJob(null);
    } catch (error) {
      toast.error('Failed to delete job');
      console.error('Error deleting job:', error);
    }
  };

  const handleSubmitWorker = async (workerData: Omit<Worker, 'id' | 'created_at'>) => {
    try {
      console.log('WeekView: Submitting worker:', workerData);
      
      // Wait for the worker to be added
      await addWorker(workerData);
      
      console.log('WeekView: Worker added successfully');
      setIsWorkerFormOpen(false);
      toast.success('Worker added successfully');
      
      // Fetch the updated worker list
      fetchWorkers();
    } catch (error) {
      console.error('WeekView: Error adding worker:', error);
      toast.error('Failed to add worker: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };
  
  const handleJobDrop = async (job: Job, workerId: string | null, date: Date | null) => {
    try {
      let updates: Partial<Job> = {
        worker_id: workerId,
        start_date: date ? date.toISOString() : null
      };

      if (date && job.start_date && job.end_date) {
        const originalDuration = differenceInDays(
          parseISO(job.end_date),
          parseISO(job.start_date)
        );
        updates.end_date = addDays(date, originalDuration).toISOString();
      } else if (date) {
        updates.end_date = date.toISOString();
      } else {
        updates.end_date = null;
      }
      
      console.log('WeekView: Updating job with drop info:', {
        job_id: job.id,
        updates
      });
      
      await updateJob(job.id, updates);
      toast.success('Job updated successfully');
    } catch (error) {
      toast.error('Failed to update job');
      console.error('Error updating job:', error);
    }
  };

  const handleJobResize = async (job: Job, days: number) => {
    try {
      if (!job.start_date) {
        console.error('Cannot resize job without start_date');
        return;
      }
      
      const startDate = parseISO(job.start_date);
      const newEndDate = addDays(startDate, days - 1);
      
      console.log('WeekView: Resizing job:', {
        job_id: job.id,
        days,
        start_date: job.start_date,
        new_end_date: newEndDate.toISOString()
      });
      
      await updateJob(job.id, {
        end_date: newEndDate.toISOString()
      });
      toast.success('Job duration updated');
    } catch (error) {
      toast.error('Failed to update job duration');
      console.error('Error resizing job:', error);
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
      
      {/* Warning messages */}
      {workers.length === 0 && (
        <div className="p-4 bg-yellow-50 border-b border-yellow-200">
          <p className="text-yellow-800 font-medium">No workers found in database. Add a worker to start scheduling jobs.</p>
        </div>
      )}
      
      {jobs.length === 0 && (
        <div className="p-4 bg-yellow-50 border-b border-yellow-200">
          <p className="text-yellow-800 font-medium">No jobs found in database. Add jobs to start scheduling.</p>
        </div>
      )}
      
      {!session && (
        <div className="p-4 bg-amber-50 border-b border-amber-200">
          <p className="text-amber-800 font-medium">Waiting for authentication... Data will load when you're signed in.</p>
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
          />
        </div>
        
        {/* Fixed-width unscheduled jobs panel */}
        <UnscheduledPanel 
          jobs={unscheduledJobs}
          onJobDrop={handleJobDrop}
          onJobClick={(job) => {
            setSelectedJob(job);
            setIsJobFormOpen(true);
          }}
        />
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
        />
      )}

      {/* Worker form modal */}
      {isWorkerFormOpen && (
        <WorkerForm
          onClose={() => setIsWorkerFormOpen(false)}
          onSubmit={handleSubmitWorker}
        />
      )}
    </div>
  );
};

export default WeekView;