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
import JobForm from '../jobs/JobForm';
import WorkerForm from '../workers/WorkerForm';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

interface WeekViewProps {
  readOnly?: boolean;
}

const WeekView: React.FC<WeekViewProps> = ({ readOnly = false }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isJobFormOpen, setIsJobFormOpen] = useState(false);
  const [isWorkerFormOpen, setIsWorkerFormOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  
  const { jobs, fetchJobs, addJob, updateJob, deleteJob } = useJobStore();
  const { workers, fetchWorkers, addWorker } = useWorkerStore();
  const { isAdmin } = useAuth();
  
  const canEdit = isAdmin && !readOnly;
  
  // Get start and end of week
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  
  // Generate days of week
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
  
  // Handle week navigation
  const prevWeek = () => setCurrentDate(subWeeks(currentDate, 1));
  const nextWeek = () => setCurrentDate(addWeeks(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());
  
  // Force data refresh when component mounts
  useEffect(() => {
    fetchJobs();
    fetchWorkers();
  }, [fetchJobs, fetchWorkers]);
  
  // Get unscheduled jobs
  const unscheduledJobs = jobs.filter(job => !job.worker_id || !job.start_date);
  
  // Get jobs for a worker on a specific day
  const getWorkerDayJobs = (workerId: string | null, day: Date) => {
    return jobs.filter(job => {
      // First check if the job is assigned to this worker
      if (job.worker_id !== workerId) return false;
      
      // If the job has no start_date, it can't be displayed on a specific day
      if (!job.start_date) return false;
      
      const jobStart = parseISO(job.start_date);
      
      // If it has an end_date, check if the day falls within the range
      if (job.end_date) {
        const jobEnd = parseISO(job.end_date);
        
        // Check if this day is within the job's date range
        return isWithinInterval(day, { start: jobStart, end: jobEnd }) || 
               isSameDay(jobStart, day) || 
               isSameDay(jobEnd, day);
      }
      
      // If no end_date, just check if the day matches the start date
      return isSameDay(jobStart, day);
    });
  };
  
  const handleSubmitJob = async (jobData: Omit<Job, 'id' | 'created_at'>) => {
    if (!canEdit) return;
    
    try {
      if (selectedJob) {
        await updateJob(selectedJob.id, jobData);
        await fetchJobs(); // Force refresh after update
        toast.success('Job updated successfully');
      } else {
        await addJob(jobData);
        await fetchJobs(); // Force refresh after add
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
    if (!canEdit) return;
    
    try {
      await deleteJob(id);
      await fetchJobs(); // Force refresh after delete
      toast.success('Job deleted successfully');
      setIsJobFormOpen(false);
      setSelectedJob(null);
    } catch (error) {
      toast.error('Failed to delete job');
      console.error('Error deleting job:', error);
    }
  };

  const handleSubmitWorker = async (workerData: Omit<Worker, 'id' | 'created_at'>) => {
    if (!canEdit) return;
    
    try {
      await addWorker(workerData);
      await fetchWorkers(); // Force refresh after add
      toast.success('Worker added successfully');
      setIsWorkerFormOpen(false);
    } catch (error) {
      toast.error('Failed to add worker');
      console.error('Error adding worker:', error);
    }
  };
  
  const handleJobDrop = async (job: Job, workerId: string | null, date: Date | null) => {
    if (!canEdit) return;
    
    try {
      let updates: Partial<Job> = {
        worker_id: workerId,
        start_date: date ? date.toISOString() : null
      };

      // Calculate end date based on original duration
      if (date && job.start_date && job.end_date) {
        const originalDuration = differenceInDays(
          parseISO(job.end_date),
          parseISO(job.start_date)
        );
        updates.end_date = addDays(date, originalDuration).toISOString();
      } else if (date) {
        // If it's a new job or didn't have dates before, make it a single-day job
        updates.end_date = date.toISOString();
      } else {
        updates.end_date = null;
      }
      
      await updateJob(job.id, updates);
      await fetchJobs(); // Force refresh after update
      toast.success('Job updated successfully');
    } catch (error) {
      toast.error('Failed to update job');
      console.error('Error updating job:', error);
    }
  };

  const handleJobResize = async (job: Job, days: number) => {
    if (!canEdit) return;
    
    try {
      const startDate = job.start_date ? parseISO(job.start_date) : new Date();
      const newEndDate = addDays(startDate, days - 1); // -1 because the start day counts as day 1
      
      await updateJob(job.id, {
        end_date: newEndDate.toISOString()
      });
      await fetchJobs(); // Force refresh after update
      toast.success('Job duration updated');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error resizing job:', error);
      toast.error(`Failed to update job duration: ${errorMessage}`);
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
            onNewWorker={() => canEdit && setIsWorkerFormOpen(true)}
            readOnly={!canEdit}
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
          readOnly={!canEdit}
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
          onDelete={canEdit ? handleDeleteJob : undefined}
          initialJob={selectedJob || undefined}
          readOnly={!canEdit}
        />
      )}

      {/* Worker form modal */}
      {isWorkerFormOpen && canEdit && (
        <WorkerForm
          onClose={() => setIsWorkerFormOpen(false)}
          onSubmit={handleSubmitWorker}
        />
      )}
    </div>
  );
};

export default WeekView;