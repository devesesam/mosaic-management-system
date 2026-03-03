import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isToday,
  startOfWeek,
  endOfWeek,
  parseISO,
  isSameDay,
  addDays,
  addMonths,
  subMonths,
  differenceInDays,
  isWithinInterval
} from 'date-fns';
import { useDrop } from 'react-dnd';
import { Job, Worker } from '../../types';
import UnscheduledPanel from './UnscheduledPanel';
import GlobalJobSearch from './GlobalJobSearch';
import { useJobsStore } from '../../store/jobsStore';
import { useAuth } from '../../context/AuthContext';
import JobForm from '../jobs/JobForm';
import DayJobsModal from './DayJobsModal';
import DraggableJob from './DraggableJob';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface MonthViewProps {
  readOnly?: boolean;
}

const MonthView: React.FC<MonthViewProps> = ({ readOnly = false }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isJobFormOpen, setIsJobFormOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isJobsPaneCollapsed, setIsJobsPaneCollapsed] = useState(() => {
    return localStorage.getItem('jobsPaneCollapsed') === 'true';
  });

  // Toggle jobs pane and persist to localStorage
  const toggleJobsPane = () => {
    const newValue = !isJobsPaneCollapsed;
    setIsJobsPaneCollapsed(newValue);
    localStorage.setItem('jobsPaneCollapsed', String(newValue));
  };
  
  // Use store for data access
  const { 
    jobs, 
    loading: jobsLoading, 
    error: jobsError, 
    fetchJobs,
    addJob,
    updateJob,
    deleteJob
  } = useJobsStore();

  const { user, currentWorker } = useAuth();
  
  // Debug log the jobs data
  useEffect(() => {
    if (jobs.length > 0) {
      console.log('MonthView: Jobs loaded:', jobs.length);
    }
  }, [jobs]);
  
  // Get start and end of week
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  
  // Navigation handlers
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());
  
  // Get the start of the week for the first day of the month
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  // Get the end of the week for the last day of the month
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  
  // Get all days in the calendar (including days from prev/next months)
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  
  // Create weeks array
  const weeks = useMemo(() => {
    const result: Date[][] = [];
    let currentWeek: Date[] = [];
    
    calendarDays.forEach((day) => {
      currentWeek.push(day);
      
      if (currentWeek.length === 7) {
        result.push(currentWeek);
        currentWeek = [];
      }
    });
    
    return result;
  }, [calendarDays]);

  // Fetch data when component mounts
  useEffect(() => {
    console.log('MonthView: Initial data load');
    fetchJobs();
  }, [fetchJobs]);

  // Show toast notifications for loading states
  useEffect(() => {
    if (jobsLoading) {
      toast.loading('Updating jobs...', { id: 'jobs-loading' });
    } else {
      toast.dismiss('jobs-loading');
    }
  }, [jobsLoading]);

  // Get unscheduled jobs - filter for read-only mode
  const unscheduledJobs = useMemo(() => {
    const baseUnscheduled = jobs.filter(job => !job.start_date && !job.worker_id);
    
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

  // Get jobs for a specific day - filter for read-only mode and include secondary workers
  const getDayJobs = useCallback((day: Date) => {
    const allDayJobs = jobs.filter(job => {
      // If job has no start date, it can't be displayed on a specific day
      if (!job.start_date) return false;
      
      try {
        const jobStart = parseISO(job.start_date);
        
        // If job has an end date, check if the day falls within the range
        if (job.end_date) {
          const jobEnd = parseISO(job.end_date);
          
          // Check if this day is within the job's date range
          return isWithinInterval(day, { start: jobStart, end: jobEnd }) || 
                 isSameDay(jobStart, day) || 
                 isSameDay(jobEnd, day);
        }
        
        // If no end date, just check if the day matches the start date
        return isSameDay(jobStart, day);
      } catch (error) {
        console.error('Error parsing job dates:', error, job);
        return false;
      }
    });

    // Filter for read-only mode: only show jobs where current worker is primary or secondary
    if (readOnly && currentWorker) {
      return allDayJobs.filter(job => 
        job.worker_id === currentWorker.id || 
        (job.secondary_worker_ids && job.secondary_worker_ids.includes(currentWorker.id))
      );
    }
    
    return allDayJobs;
  }, [jobs, readOnly, currentWorker]);
  
  // Get jobs that should be displayed on their start date only
  const getStartDateJobs = useCallback((day: Date) => {
    const startDateJobs = jobs.filter(job => {
      // If job has no start date, it can't be displayed
      if (!job.start_date) return false;
      
      try {
        const jobStart = parseISO(job.start_date);
        
        // Only show jobs on their actual start date
        return isSameDay(jobStart, day);
      } catch (error) {
        console.error('Error parsing job dates:', error, job);
        return false;
      }
    });

    // Filter for read-only mode: only show jobs where current worker is primary or secondary
    if (readOnly && currentWorker) {
      return startDateJobs.filter(job => 
        job.worker_id === currentWorker.id || 
        (job.secondary_worker_ids && job.secondary_worker_ids.includes(currentWorker.id))
      );
    }
    
    return startDateJobs;
  }, [jobs, readOnly, currentWorker]);

  const handleJobDrop = async (job: Job, date: Date) => {
    if (readOnly) {
      toast.error('Cannot move jobs in read-only mode');
      return;
    }
    
    try {
      console.log('MonthView: Handling job drop:', { job_id: job.id, date });
      
      let updates: Partial<Job> = {
        start_date: date.toISOString()
      };

      // Calculate end date to preserve the job's duration
      if (job.start_date && job.end_date) {
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
          
          console.log('MonthView: Preserving job duration:', {
            job_id: job.id,
            original_start: job.start_date,
            original_end: job.end_date,
            original_duration_days: durationInDays,
            new_start: date.toISOString(),
            new_end: newEndDate.toISOString()
          });
        } catch (error) {
          console.error('Error calculating job duration:', error, job);
          // If we can't calculate duration, make it a single-day job
          updates.end_date = date.toISOString();
        }
      } else {
        // If it's a new job or didn't have dates before, make it a single-day job
        updates.end_date = date.toISOString();
      }
      
      console.log('MonthView: Updating job with:', updates);
      await updateJob(job.id, updates);
    } catch (error) {
      console.error('Error updating job:', error);
      toast.error('Failed to move job. Please try again.');
    }
  };

  const handleJobSubmit = async (jobData: Omit<Job, 'id' | 'created_at'>) => {
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
      console.error('Error updating job:', error);
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

  // Handle job resize
  const handleJobResize = async (job: Job, days: number) => {
    if (readOnly) {
      toast.error('Cannot resize jobs in read-only mode');
      return;
    }
    
    try {
      console.log('MonthView: Handling job resize:', { job_id: job.id, days });
      
      if (!job.start_date) {
        console.error('Cannot resize job without start_date');
        return;
      }
      
      const startDate = parseISO(job.start_date);
      const newEndDate = addDays(startDate, days - 1); // -1 because the start day counts as day 1
      
      await updateJob(job.id, {
        end_date: newEndDate.toISOString()
      });
    } catch (error) {
      console.error('Error resizing job:', error);
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Main content area with flex layout */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Month navigation header */}
        <div className="flex items-center justify-between p-2 bg-white border-b border-gray-200">
          {/* Left: Navigation */}
          <div className="flex items-center space-x-2 flex-shrink-0">
            <button
              onClick={prevMonth}
              className="p-1 rounded-full hover:bg-gray-100 transition-colors"
              title="Previous month"
            >
              <ChevronLeft className="h-5 w-5 text-gray-600" />
            </button>
            <h2 className="text-xl font-semibold text-gray-800 whitespace-nowrap">
              {format(currentDate, 'MMMM yyyy')}
            </h2>
            <button
              onClick={nextMonth}
              className="p-1 rounded-full hover:bg-gray-100 transition-colors"
              title="Next month"
            >
              <ChevronRight className="h-5 w-5 text-gray-600" />
            </button>
          </div>

          {/* Center: Search bar */}
          <div className="flex-1 flex justify-center px-4">
            <GlobalJobSearch
              jobs={jobs}
              onJobSelect={(job) => {
                setSelectedJob(job);
                setIsJobFormOpen(true);
              }}
            />
          </div>

          {/* Right: Today button */}
          <div className="flex-shrink-0">
            <button
              onClick={goToToday}
              className="text-sm text-margaux hover:text-blueberry font-medium whitespace-nowrap"
            >
              Today
            </button>
          </div>
        </div>
        
        {/* Error messages - keep these but make them less prominent */}
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
        {!jobsLoading && !jobsError && jobs.length === 0 && (
          <div className="px-4 py-2 bg-yellow-50 border-b border-yellow-100 text-sm">
            <span className="text-yellow-700">No jobs found. Add jobs to start scheduling.</span>
          </div>
        )}
        
        {/* Main calendar and sidebar layout */}
        <div className="flex flex-1 overflow-hidden">
          {/* Calendar area - takes remaining space */}
          <div className="flex-1 flex flex-col min-w-0 bg-white">
            {/* Weekday headers - fixed position */}
            <div className="grid grid-cols-7 gap-px bg-gray-200 flex-shrink-0 sticky top-0 z-10">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                <div key={day} className="text-center text-xs font-medium text-charcoal py-2 bg-garlic">
                  {day}
                </div>
              ))}
            </div>
            
            {/* Calendar grid with guaranteed vertical scroll */}
            <div 
              className="flex-1 bg-gray-200 overflow-y-scroll overflow-x-hidden" 
              style={{ 
                maxHeight: 'calc(100vh - 200px)', // Force a max height to ensure scrollbar
                scrollbarWidth: 'thin', // For Firefox
                scrollbarColor: '#cbd5e1 #f1f5f9' // For Firefox
              }}
            >
              <div className="grid grid-cols-7 gap-px">
                {weeks.map((week, weekIndex) => 
                  week.map((day, dayIndex) => (
                    <CalendarDay
                      key={`${weekIndex}-${dayIndex}`}
                      day={day}
                      currentDate={currentDate}
                      jobs={getDayJobs(day)}
                      startDateJobs={getStartDateJobs(day)}
                      onJobDrop={handleJobDrop}
                      onJobClick={(job) => {
                        setSelectedJob(job);
                        setIsJobFormOpen(true);
                      }}
                      onShowMore={() => setSelectedDay(day)}
                      isInCurrentMonth={isSameMonth(day, currentDate)}
                      onJobResize={handleJobResize}
                      readOnly={readOnly}
                      currentWorker={currentWorker}
                    />
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Fixed-width unscheduled jobs panel as right sidebar - only show for edit mode */}
          {!readOnly && (
            <UnscheduledPanel
              jobs={unscheduledJobs}
              onJobDrop={(job) => handleJobDrop(job, new Date())}
              onJobClick={(job) => {
                setSelectedJob(job);
                setIsJobFormOpen(true);
              }}
              readOnly={readOnly}
              isCollapsed={isJobsPaneCollapsed}
              onToggleCollapse={toggleJobsPane}
            />
          )}
        </div>
      </div>

      {/* Job form modal */}
      {isJobFormOpen && (
        <JobForm
          onClose={() => {
            setIsJobFormOpen(false);
            setSelectedJob(null);
          }}
          onSubmit={handleJobSubmit}
          onDelete={handleDeleteJob}
          initialJob={selectedJob || undefined}
          readOnly={readOnly}
        />
      )}

      {/* Day jobs modal */}
      {selectedDay && (
        <DayJobsModal
          date={selectedDay}
          jobs={getDayJobs(selectedDay)}
          onClose={() => setSelectedDay(null)}
          onJobClick={(job) => {
            setSelectedJob(job);
            setIsJobFormOpen(true);
          }}
        />
      )}
    </div>
  );
};

interface CalendarDayProps {
  day: Date;
  currentDate: Date;
  jobs: Job[];
  startDateJobs: Job[];
  onJobDrop: (job: Job, date: Date) => void;
  onJobClick: (job: Job) => void;
  onShowMore: () => void;
  isInCurrentMonth: boolean;
  onJobResize: (job: Job, days: number) => void;
  readOnly?: boolean;
  currentWorker?: Worker | null;
}

const CalendarDay: React.FC<CalendarDayProps> = ({ 
  day, 
  currentDate, 
  jobs, 
  startDateJobs,
  onJobDrop, 
  onJobClick, 
  onShowMore, 
  isInCurrentMonth,
  onJobResize,
  readOnly = false,
  currentWorker
}) => {
  const [{ isOver }, drop] = useDrop({
    accept: 'JOB',
    drop: (item: { job: Job }) => {
      onJobDrop(item.job, day);
    },
    collect: monitor => ({
      isOver: !!monitor.isOver()
    }),
    canDrop: () => !readOnly
  });

  // Sort start date jobs: put primary assignments first, then secondary
  const sortedStartDateJobs = [...startDateJobs].sort((a, b) => {
    if (currentWorker) {
      const aIsPrimary = a.worker_id === currentWorker.id;
      const bIsPrimary = b.worker_id === currentWorker.id;
      
      if (aIsPrimary && !bIsPrimary) return -1;
      if (!aIsPrimary && bIsPrimary) return 1;
    }
    
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  // Simplified logic: Show "See All Jobs" if there are any jobs on this day
  const hasJobs = jobs.length > 0;

  // Helper function to determine if a job is a secondary assignment for current worker
  const isSecondaryAssignment = (job: Job) => {
    return readOnly && currentWorker && 
           job.worker_id !== currentWorker.id &&
           job.secondary_worker_ids?.includes(currentWorker.id);
  };

  return (
    <div
      ref={drop}
      className={`
        flex flex-col relative border-b border-r border-gray-200
        ${!isInCurrentMonth ? 'bg-vanilla text-gray-400' : 'bg-white'}
        ${isToday(day) ? 'bg-margaux/10' : ''}
        ${isOver && !readOnly ? 'bg-sorbet/30' : ''}
        ${readOnly ? 'cursor-default' : ''}
      `}
    >
      <div className="text-right px-2 py-1 text-sm font-medium border-b border-gray-100 flex-shrink-0">
        {format(day, 'd')}
      </div>
      
      {/* Container for job tiles - only show jobs that start on this day */}
      <div 
        className="flex-1 p-1 flex flex-col"
      >
        {/* Single-day and multi-day jobs starting on this date - show first 3 */}
        {sortedStartDateJobs.map((job, index) => {
          const isSecondary = isSecondaryAssignment(job);
          const zIndex = isSecondary ? 5 : 10;
          
          return (
            <div 
              key={`job-${job.id}`} 
              className={`mb-1 ${isSecondary ? 'opacity-80' : ''}`}
              style={{ zIndex: zIndex }}
            >
              <DraggableJob
                job={job}
                onClick={() => onJobClick(job)}
                isScheduled={true}
                isWeekView={false}
                // Only allow resize if not read-only AND not a secondary assignment
                onResize={!readOnly && !isSecondary ? onJobResize : undefined}
                readOnly={readOnly || isSecondary}
              />
            </div>
          );
        })}
        
      </div>
    </div>
  );
};

export default MonthView;