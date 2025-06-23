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
import { Job } from '../../types';
import UnscheduledPanel from './UnscheduledPanel';
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

  // Get ALL jobs spanning a specific day (for +X more calculation) - filter for read-only mode
  const getAllJobsSpanningDay = useCallback((day: Date) => {
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
  
  // Helper function to check if a date is within a range (inclusive)
  const isWithinRange = (date: Date, start: Date, end: Date) => {
    return (
      (date > start && date < end) ||
      isSameDay(date, start) ||
      isSameDay(date, end)
    );
  };
  
  // Helper function to check if a row is already occupied at specific columns
  const isRowOccupied = (assignments: number[], rowIdx: number, startCol: number, endCol: number) => {
    for (let col = startCol; col <= endCol; col++) {
      if (assignments[col] && assignments[col].includes(rowIdx)) {
        return true;
      }
    }
    return false;
  };
  
  // Calculate multi-day job positions for the entire month view
  const getMultiDayJobs = useCallback(() => {
    // For multiple weeks, we need to calculate row positions for multi-day jobs
    const multiDayJobs: {job: Job, startCol: number, endCol: number, weekIdx: number, rowIdx: number, isSecondary: boolean}[] = [];
    const rowAssignments: Record<string, number[][]> = {}; // Track row assignments by week
    
    // Get all multi-day jobs - filter for read-only mode
    let jobsWithDates = jobs.filter(job => {
      if (!job.start_date || !job.end_date) return false;
      
      try {
        const startDate = parseISO(job.start_date);
        const endDate = parseISO(job.end_date);
        
        // Check if this is a multi-day job that's visible in current month
        const isMultiDay = !isSameDay(startDate, endDate);
        const isVisible = (
          isWithinRange(startDate, calendarStart, calendarEnd) ||
          isWithinRange(endDate, calendarStart, calendarEnd) ||
          (startDate < calendarStart && endDate > calendarEnd)
        );
        
        return isMultiDay && isVisible;
      } catch (error) {
        console.error('Error parsing job dates:', error, job);
        return false;
      }
    });

    // Filter for read-only mode: only show jobs where current worker is primary or secondary
    if (readOnly && currentWorker) {
      jobsWithDates = jobsWithDates.filter(job => 
        job.worker_id === currentWorker.id || 
        (job.secondary_worker_ids && job.secondary_worker_ids.includes(currentWorker.id))
      );
    }

    // Sort jobs: primary assignments first, then secondary assignments, then by date and duration
    jobsWithDates.sort((a, b) => {
      try {
        // In read-only mode, prioritize primary assignments over secondary
        if (readOnly && currentWorker) {
          const aIsPrimary = a.worker_id === currentWorker.id;
          const bIsPrimary = b.worker_id === currentWorker.id;
          
          if (aIsPrimary && !bIsPrimary) return -1;
          if (!aIsPrimary && bIsPrimary) return 1;
        }
        
        // Sort primarily by start date (earlier first)
        const startA = parseISO(a.start_date!);
        const startB = parseISO(b.start_date!);
        const startCompare = startA.getTime() - startB.getTime();
        if (startCompare !== 0) return startCompare;
        
        // If start dates are the same, sort by duration (longer jobs first)
        const endA = parseISO(a.end_date!);
        const endB = parseISO(b.end_date!);
        return differenceInDays(endB, startB) - differenceInDays(endA, startA);
      } catch (error) {
        console.error('Error sorting jobs:', error, { a, b });
        return 0;
      }
    });
    
    // Initialize row assignments for each week
    weeks.forEach((_, weekIdx) => {
      rowAssignments[weekIdx] = Array(7).fill(null).map(() => []);
    });
    
    // Process each multi-day job
    jobsWithDates.forEach(job => {
      try {
        const startDate = parseISO(job.start_date!);
        const endDate = parseISO(job.end_date!);
        
        // Check if this is a secondary assignment
        const isSecondary = readOnly && currentWorker && 
                           job.worker_id !== currentWorker.id &&
                           job.secondary_worker_ids?.includes(currentWorker.id);
        
        // For each week, check if the job spans days within that week
        weeks.forEach((week, weekIdx) => {
          const weekStart = week[0];
          const weekEnd = week[6];
          
          // Skip if job is completely outside this week
          if (endDate < weekStart || startDate > weekEnd) {
            return;
          }
          
          // Find start and end column within this week
          let startCol = 0;
          let endCol = 6;
          
          // Adjust start column if job starts during or after this week
          if (startDate >= weekStart) {
            for (let i = 0; i < 7; i++) {
              if (isSameDay(week[i], startDate) || (i > 0 && week[i-1] < startDate && week[i] > startDate)) {
                startCol = i;
                break;
              }
            }
          }
          
          // Adjust end column if job ends during this week
          if (endDate <= weekEnd) {
            for (let i = 6; i >= 0; i--) {
              if (isSameDay(week[i], endDate) || (i < 6 && week[i+1] > endDate && week[i] < endDate)) {
                endCol = i;
                break;
              }
            }
          }
          
          // Find an available row in this week
          let rowIdx = 0;
          while (isRowOccupied(rowAssignments[weekIdx], rowIdx, startCol, endCol)) {
            rowIdx++;
          }
          
          // Mark this row as occupied for these columns
          for (let col = startCol; col <= endCol; col++) {
            rowAssignments[weekIdx][col].push(rowIdx);
          }
          
          // Add this segment to our list
          multiDayJobs.push({
            job,
            startCol,
            endCol,
            weekIdx,
            rowIdx,
            isSecondary
          });
        });
      } catch (error) {
        console.error('Error processing multi-day job:', error, job);
      }
    });
    
    return multiDayJobs;
  }, [jobs, weeks, calendarStart, calendarEnd, readOnly, currentWorker]);
  
  const multiDayJobs = useMemo(() => getMultiDayJobs(), [getMultiDayJobs]);

  // Calculate max rows needed for each week (considering both single day and multi-day jobs)
  const weekHeights = useMemo(() => {
    return weeks.map((week, weekIndex) => {
      // First, get max row index of multi-day jobs in this week
      const multiDayRows = multiDayJobs
        .filter(mj => mj.weekIdx === weekIndex)
        .map(mj => mj.rowIdx);
      
      const maxMultiDayRow = multiDayRows.length > 0 ? Math.max(...multiDayRows) : -1;
      
      // Then, check single-day jobs in each day of the week
      const maxSingleDayJobs = week.map(day => {
        const dayJobs = getDayJobs(day).filter(job => 
          !multiDayJobs.some(mj => mj.job.id === job.id)
        );
        return dayJobs.length;
      });
      
      const maxSingleDayCount = Math.max(...maxSingleDayJobs);
      
      // Max rows needed is the greater of multi-day rows or single-day jobs count
      const maxRows = Math.max(maxMultiDayRow + 1, maxSingleDayCount);
      
      // Calculate cell height: min 120px + 26px per row + 40px padding
      return Math.max(120, (maxRows * 26) + 40);
    });
  }, [weeks, multiDayJobs, getDayJobs]);

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
          <div className="flex items-center space-x-2">
            <button
              onClick={prevMonth}
              className="p-1 rounded-full hover:bg-gray-100 transition-colors"
              title="Previous month"
            >
              <ChevronLeft className="h-5 w-5 text-gray-600" />
            </button>
            <h2 className="text-xl font-semibold text-gray-800">
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
          
          <button
            onClick={goToToday}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
          >
            Today
          </button>
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
                <div key={day} className="text-center text-xs font-medium text-gray-700 py-2 bg-gray-100">
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
                      allJobsSpanningDay={getAllJobsSpanningDay(day)}
                      onJobDrop={handleJobDrop}
                      onJobClick={(job) => {
                        setSelectedJob(job);
                        setIsJobFormOpen(true);
                      }}
                      onShowMore={() => setSelectedDay(day)}
                      isInCurrentMonth={isSameMonth(day, currentDate)}
                      weekIdx={weekIndex}
                      dayIdx={dayIndex}
                      multiDayJobs={multiDayJobs}
                      weekHeight={weekHeights[weekIndex]}
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
  allJobsSpanningDay: Job[];
  onJobDrop: (job: Job, date: Date) => void;
  onJobClick: (job: Job) => void;
  onShowMore: () => void;
  isInCurrentMonth: boolean;
  weekIdx: number;
  dayIdx: number;
  multiDayJobs: {job: Job, startCol: number, endCol: number, rowIdx: number, weekIdx: number, isSecondary: boolean}[];
  weekHeight: number;
  onJobResize: (job: Job, days: number) => void;
  readOnly?: boolean;
  currentWorker?: any;
}

const CalendarDay: React.FC<CalendarDayProps> = ({ 
  day, 
  currentDate, 
  jobs, 
  allJobsSpanningDay,
  onJobDrop, 
  onJobClick, 
  onShowMore, 
  isInCurrentMonth,
  weekIdx,
  dayIdx,
  multiDayJobs,
  weekHeight,
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

  // This day's column position in the grid (0-6)
  const colPosition = dayIdx;
  
  // Filter out jobs that are already included in multiDayJobs
  const singleDayJobs = jobs.filter(job => 
    !multiDayJobs.some(mj => mj.job.id === job.id)
  );

  // Sort single-day jobs: put primary assignments first, then secondary
  const sortedSingleDayJobs = [...singleDayJobs].sort((a, b) => {
    if (currentWorker) {
      const aIsPrimary = a.worker_id === currentWorker.id;
      const bIsPrimary = b.worker_id === currentWorker.id;
      
      if (aIsPrimary && !bIsPrimary) return -1;
      if (!aIsPrimary && bIsPrimary) return 1;
    }
    
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  // Get the multi-day jobs that start on this day for this week
  const multiDayJobsForThisDay = multiDayJobs.filter(mj => 
    mj.startCol === colPosition && mj.weekIdx === weekIdx
  );

  // Sort multi-day jobs: primary assignments first
  const sortedMultiDayJobs = [...multiDayJobsForThisDay].sort((a, b) => {
    if (a.isSecondary && !b.isSecondary) return 1;
    if (!a.isSecondary && b.isSecondary) return -1;
    return a.rowIdx - b.rowIdx;
  });

  // Show a "more" button if there are too many jobs to display
  const visibleRows = 2; // Number of rows to display before showing "more" button
  
  // Calculate "+X more" using ALL jobs spanning this day
  const totalJobsOnDay = allJobsSpanningDay.length;
  
  // Count how many jobs are actually rendered in this cell
  const renderedJobsCount = Math.min(sortedSingleDayJobs.length, visibleRows) + sortedMultiDayJobs.length;
  
  // Calculate hidden jobs count
  const hiddenJobsCount = totalJobsOnDay - renderedJobsCount;
  const hasMoreJobs = hiddenJobsCount > 0;

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
        ${!isInCurrentMonth ? 'bg-gray-50 text-gray-400' : 'bg-white'}
        ${isToday(day) ? 'bg-blue-50' : ''}
        ${isOver && !readOnly ? 'bg-blue-100' : ''}
        ${readOnly ? 'cursor-default' : ''}
      `}
      style={{ height: `${weekHeight}px`, minHeight: '120px' }}
    >
      <div className="text-right px-2 py-1 text-sm font-medium border-b border-gray-100 flex-shrink-0">
        {format(day, 'd')}
      </div>
      
      {/* Container for both single-day and multi-day jobs */}
      <div 
        className="flex-1 p-1 overflow-hidden relative"
        style={{ minHeight: 'calc(100% - 28px)' }}
      >
        {/* Single-day jobs */}
        {sortedSingleDayJobs.slice(0, visibleRows).map((job, index) => {
          const isSecondary = isSecondaryAssignment(job);
          const zIndex = isSecondary ? 5 : 10;
          
          return (
            <div 
              key={`single-${job.id}`} 
              className={`mb-1 h-6 ${isSecondary ? 'opacity-80' : ''}`}
              style={{ 
                marginTop: index * 26 + 'px',
                zIndex: zIndex,
                position: 'relative'
              }}
            >
              <DraggableJob
                job={job}
                onClick={() => onJobClick(job)}
                isScheduled={true}
                isWeekView={false}
                readOnly={readOnly || isSecondary}
              />
            </div>
          );
        })}
        
        {/* More jobs indicator */}
        {hasMoreJobs && (
          <button
            onClick={onShowMore}
            className="text-xs text-black absolute bottom-1 left-1 hover:text-gray-700 hover:underline"
            style={{ zIndex: 20 }}
          >
            +{hiddenJobsCount} more
          </button>
        )}
      </div>

      {/* Multi-day job segments */}
      {sortedMultiDayJobs.map(({ job, startCol, endCol, rowIdx, isSecondary }) => {
        const spanDays = endCol - startCol + 1;
        const zIndex = isSecondary ? 5 : 10;
        
        return (
          <div 
            key={`multiday-${job.id}`}
            className={`absolute left-0 ${isSecondary ? 'opacity-80' : ''}`}
            style={{
              width: `calc(${spanDays} * 100%)`,
              top: `${30 + rowIdx * 26}px`, // Position based on row index
              height: '24px',
              zIndex: zIndex
            }}
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
  );
};

export default MonthView;