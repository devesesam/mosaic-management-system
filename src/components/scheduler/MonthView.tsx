import React, { useState, useEffect, useMemo } from 'react';
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
  isBefore,
  isAfter,
  max,
  isWithinInterval
} from 'date-fns';
import { useDrop } from 'react-dnd';
import { Job } from '../../types';
import { useJobStore } from '../../store/jobStore';
import UnscheduledPanel from './UnscheduledPanel';
import JobForm from '../jobs/JobForm';
import DayJobsModal from './DayJobsModal';
import DraggableJob from './DraggableJob';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

interface MonthViewProps {
  readOnly?: boolean;
}

const MonthView: React.FC<MonthViewProps> = ({ readOnly = false }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isJobFormOpen, setIsJobFormOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  
  const { jobs, fetchJobs, updateJob, deleteJob } = useJobStore();
  const { isAdmin } = useAuth();
  
  const canEdit = isAdmin && !readOnly;
  
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
  const weeks: Date[][] = [];
  let currentWeek: Date[] = [];
  
  calendarDays.forEach((day) => {
    currentWeek.push(day);
    
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });

  // Force refresh jobs when component mounts
  useEffect(() => {
    console.log('MonthView: Component mounted - Forcing data refresh');
    fetchJobs();
  }, [fetchJobs]);
  
  // Also set up an interval to refresh data periodically
  useEffect(() => {
    const intervalId = setInterval(() => {
      console.log('MonthView: Periodic data refresh');
      fetchJobs();
    }, 60000); // Refresh every minute
    
    return () => clearInterval(intervalId);
  }, [fetchJobs]);
  
  // Debug to check data loading
  useEffect(() => {
    console.log('MonthView: Jobs loaded:', jobs.length);
    if (jobs.length > 0) {
      console.log('MonthView: Sample job:', jobs[0]);
    }
  }, [jobs]);

  // Get unscheduled jobs (no date and no worker)
  const unscheduledJobs = jobs.filter(job => !job.start_date && !job.worker_id);

  // Get jobs for a specific day - less restrictive to show more jobs
  const getDayJobs = (day: Date) => {
    return jobs.filter(job => {
      // If job has no start date, it can't be displayed on a specific day
      if (!job.start_date) return false;
      
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
    });
  };
  
  // Helper function to check if a date is within a range (inclusive)
  const isWithinRange = (date: Date, start: Date, end: Date) => {
    return (
      isAfter(date, start) && isBefore(date, end) ||
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
  const getMultiDayJobs = () => {
    // For multiple weeks, we need to calculate row positions for multi-day jobs
    const multiDayJobs: {job: Job, startCol: number, endCol: number, weekIdx: number, rowIdx: number}[] = [];
    const rowAssignments: Record<string, number[][]> = {}; // Track row assignments by week
    
    // Get all multi-day jobs
    const jobsWithDates = jobs.filter(job => 
      job.start_date && job.end_date && 
      !isSameDay(parseISO(job.start_date), parseISO(job.end_date)) && 
      // Only include jobs that would be visible in the current month view
      (
        isWithinRange(parseISO(job.start_date), calendarStart, calendarEnd) ||
        isWithinRange(parseISO(job.end_date), calendarStart, calendarEnd) ||
        (isBefore(parseISO(job.start_date), calendarStart) && isAfter(parseISO(job.end_date), calendarEnd))
      )
    ).sort((a, b) => {
      // Sort primarily by start date (earlier first)
      const startA = parseISO(a.start_date!);
      const startB = parseISO(b.start_date!);
      const startCompare = startA.getTime() - startB.getTime();
      if (startCompare !== 0) return startCompare;
      
      // If start dates are the same, sort by duration (longer jobs first)
      const endA = parseISO(a.end_date!);
      const endB = parseISO(b.end_date!);
      return differenceInDays(endB, startB) - differenceInDays(endA, startA);
    });
    
    // Initialize row assignments for each week
    weeks.forEach((_, weekIdx) => {
      rowAssignments[weekIdx] = Array(7).fill(null).map(() => []);
    });
    
    // Process each multi-day job
    jobsWithDates.forEach(job => {
      const startDate = parseISO(job.start_date!);
      const endDate = parseISO(job.end_date!);
      
      // For each week, check if the job spans days within that week
      weeks.forEach((week, weekIdx) => {
        const weekStart = week[0];
        const weekEnd = week[6];
        
        // Skip if job is completely outside this week
        if (isBefore(endDate, weekStart) || isAfter(startDate, weekEnd)) {
          return;
        }
        
        // Find start and end column within this week
        let startCol = 0;
        let endCol = 6;
        
        // Adjust start column if job starts during or after this week
        if (isAfter(startDate, weekStart) || isSameDay(startDate, weekStart)) {
          for (let i = 0; i < 7; i++) {
            if (isSameDay(week[i], startDate) || (i > 0 && isBefore(week[i-1], startDate) && isAfter(week[i], startDate))) {
              startCol = i;
              break;
            }
          }
        }
        
        // Adjust end column if job ends during this week
        if (isBefore(endDate, weekEnd) || isSameDay(endDate, weekEnd)) {
          for (let i = 6; i >= 0; i--) {
            if (isSameDay(week[i], endDate) || (i < 6 && isAfter(week[i+1], endDate) && isBefore(week[i], endDate))) {
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
          rowIdx
        });
      });
    });
    
    return multiDayJobs;
  };
  
  const multiDayJobs = getMultiDayJobs();

  // Calculate max rows needed for each week (considering both single day and multi-day jobs)
  const weekHeights = weeks.map((week, weekIndex) => {
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
    
    // Calculate cell height: min 100px + 24px per row + 40px padding
    return Math.max(100, (maxRows * 24) + 40);
  });

  const handleJobDrop = async (job: Job, date: Date) => {
    if (!canEdit) return;
    
    try {
      console.log('MonthView: Handling job drop:', { job_id: job.id, date });
      
      let updates: Partial<Job> = {
        start_date: date.toISOString()
      };

      // Calculate end date based on original duration
      if (job.start_date && job.end_date) {
        const originalDuration = differenceInDays(
          parseISO(job.end_date),
          parseISO(job.start_date)
        );
        updates.end_date = addDays(date, originalDuration).toISOString();
      } else {
        // If it's a new job or didn't have dates before, make it a single-day job
        updates.end_date = date.toISOString();
      }
      
      console.log('MonthView: Updating job with:', updates);
      await updateJob(job.id, updates);
      await fetchJobs(); // Refresh jobs after update
      toast.success('Job scheduled');
    } catch (error) {
      toast.error('Failed to schedule job');
      console.error('Error updating job:', error);
    }
  };

  const handleJobSubmit = async (jobData: Omit<Job, 'id' | 'created_at'>) => {
    if (!canEdit) return;
    
    try {
      if (selectedJob) {
        await updateJob(selectedJob.id, jobData);
        await fetchJobs(); // Refresh jobs after update
        toast.success('Job updated successfully');
      }
      setIsJobFormOpen(false);
      setSelectedJob(null);
    } catch (error) {
      toast.error('Failed to update job');
      console.error('Error updating job:', error);
    }
  };

  const handleDeleteJob = async (id: string) => {
    if (!canEdit) return;
    
    try {
      await deleteJob(id);
      await fetchJobs(); // Refresh jobs after delete
      toast.success('Job deleted successfully');
      setIsJobFormOpen(false);
      setSelectedJob(null);
    } catch (error) {
      toast.error('Failed to delete job');
      console.error('Error deleting job:', error);
    }
  };

  // Handle job resize
  const handleJobResize = async (job: Job, days: number) => {
    if (!canEdit) return;
    
    try {
      console.log('MonthView: Handling job resize:', { job_id: job.id, days });
      
      const startDate = job.start_date ? parseISO(job.start_date) : new Date();
      const newEndDate = addDays(startDate, days - 1); // -1 because the start day counts as day 1
      
      await updateJob(job.id, {
        end_date: newEndDate.toISOString()
      });
      await fetchJobs(); // Refresh jobs after update
      toast.success('Job duration updated');
    } catch (error) {
      toast.error('Failed to update job duration');
      console.error('Error resizing job:', error);
    }
  };
  
  // Debug UI to show job data
  const DebugPanel = () => (
    <div className="p-3 bg-white border-b border-gray-200 text-sm text-gray-600">
      <details>
        <summary className="cursor-pointer font-medium">Debug Information</summary>
        <div className="mt-2 p-3 bg-gray-50 rounded-md space-y-2">
          <div>
            <strong>Jobs:</strong> {jobs.length} loaded ({unscheduledJobs.length} unscheduled)
            {jobs.length > 0 && (
              <ul className="ml-4 list-disc">
                {jobs.slice(0, 3).map(j => (
                  <li key={j.id}>{j.address} - {j.status}</li>
                ))}
                {jobs.length > 3 && <li>...and {jobs.length - 3} more</li>}
              </ul>
            )}
          </div>
          
          <button 
            onClick={() => fetchJobs()}
            className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
          >
            Refresh Jobs
          </button>
        </div>
      </details>
    </div>
  );

  return (
    <div className="flex h-full flex-col">
      {/* Main calendar area with flex-1 to take remaining space */}
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
        
        {/* Debug panel */}
        <DebugPanel />
        
        {/* Debug information */}
        {jobs.length === 0 && (
          <div className="p-4 bg-yellow-50 border-b border-yellow-200">
            <p className="text-yellow-800 font-medium">No jobs found in database. Add jobs to start scheduling.</p>
          </div>
        )}
        
        <div className="flex-1 grid grid-rows-[auto_1fr] overflow-hidden bg-white">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-px bg-gray-200">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
              <div key={day} className="text-center text-xs font-medium text-gray-700 py-1 bg-gray-100">
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar grid */}
          <div className="grid grid-cols-7 grid-rows-[repeat(6,auto)] gap-px bg-gray-200 overflow-auto">
            {weeks.map((week, weekIndex) => 
              week.map((day, dayIndex) => (
                <CalendarDay
                  key={`${weekIndex}-${dayIndex}`}
                  day={day}
                  
                  currentDate={currentDate}
                  jobs={getDayJobs(day)}
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
                  readOnly={!canEdit}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Fixed-width unscheduled jobs panel */}
      <UnscheduledPanel
        jobs={unscheduledJobs}
        onJobDrop={(job) => handleJobDrop(job, new Date())}
        onJobClick={(job) => {
          setSelectedJob(job);
          setIsJobFormOpen(true);
        }}
        readOnly={!canEdit}
      />

      {/* Job form modal */}
      {isJobFormOpen && (
        <JobForm
          onClose={() => {
            setIsJobFormOpen(false);
            setSelectedJob(null);
          }}
          onSubmit={handleJobSubmit}
          onDelete={canEdit ? handleDeleteJob : undefined}
          initialJob={selectedJob || undefined}
          readOnly={!canEdit}
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
  onJobDrop: (job: Job, date: Date) => void;
  onJobClick: (job: Job) => void;
  onShowMore: () => void;
  isInCurrentMonth: boolean;
  weekIdx: number;
  dayIdx: number;
  multiDayJobs: {job: Job, startCol: number, endCol: number, rowIdx: number, weekIdx: number}[];
  weekHeight: number;
  onJobResize: (job: Job, days: number) => void;
  readOnly?: boolean;
}

const CalendarDay: React.FC<CalendarDayProps> = ({ 
  day, 
  currentDate, 
  jobs, 
  onJobDrop, 
  onJobClick, 
  onShowMore, 
  isInCurrentMonth,
  weekIdx,
  dayIdx,
  multiDayJobs,
  weekHeight,
  onJobResize,
  readOnly = false
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

  // Get the multi-day jobs that start on this day for this week
  const multiDayJobsForThisDay = multiDayJobs.filter(mj => 
    mj.startCol === colPosition && mj.weekIdx === weekIdx
  );

  // Show a "more" button if there are too many jobs to display
  const visibleRows = 2; // Number of rows to display before showing "more" button
  const totalSingleDayJobs = singleDayJobs.length;
  const hasMoreJobs = totalSingleDayJobs > visibleRows;

  return (
    <div 
      ref={drop}
      className={`
        flex flex-col relative
        ${!isInCurrentMonth ? 'bg-gray-50 text-gray-400' : 'bg-white'}
        ${isToday(day) ? 'bg-blue-50' : ''}
        ${isOver ? 'bg-blue-100' : ''}
      `}
      style={{ height: `${weekHeight}px` }}
    >
      <div className="text-right px-1.5 py-0.5 text-xs font-medium border-b border-gray-100">
        {format(day, 'd')}
      </div>
      
      {/* Container for both single-day and multi-day jobs */}
      <div 
        className="flex-1 p-0.5 mt-0.5 overflow-hidden relative"
        style={{ height: 'calc(100% - 20px)' }}
      >
        {/* Single-day jobs */}
        {singleDayJobs.slice(0, visibleRows).map((job, index) => (
          <div 
            key={`single-${job.id}`} 
            className="mb-0.5 h-6"
            style={{ marginTop: index * 24 + 'px' }}
          >
            <DraggableJob
              job={job}
              onClick={() => onJobClick(job)}
              isScheduled={true}
              isWeekView={false}
              readOnly={readOnly}
            />
          </div>
        ))}
        
        {/* More jobs indicator */}
        {hasMoreJobs && (
          <button
            onClick={onShowMore}
            className="text-xs text-gray-500 absolute bottom-1 left-1 hover:text-gray-700 hover:underline mt-1"
          >
            +{totalSingleDayJobs - visibleRows} more
          </button>
        )}
      </div>

      {/* Multi-day job segments */}
      {multiDayJobsForThisDay.map(({ job, startCol, endCol, rowIdx }) => {
        const spanDays = endCol - startCol + 1;
        return (
          <div 
            key={`multiday-${job.id}`}
            className="absolute left-0 z-10"
            style={{
              width: `calc(${spanDays} * 100%)`,
              top: `${24 + rowIdx * 24}px`, // Position based on row index
            }}
          >
            <DraggableJob
              job={job}
              onClick={() => onJobClick(job)}
              isScheduled={true}
              isWeekView={false}
              onResize={(days) => onJobResize(job, days)}
              readOnly={readOnly}
            />
          </div>
        );
      })}
    </div>
  );
};

export default MonthView;