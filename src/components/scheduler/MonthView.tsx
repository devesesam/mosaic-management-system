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
    fetchJobs();
    
    // Also set up more frequent refreshes
    const intervalId = setInterval(() => {
      fetchJobs();
    }, 10000); // Every 10 seconds
    
    return () => clearInterval(intervalId);
  }, [fetchJobs]);

  // Get unscheduled jobs (no date and no worker)
  const unscheduledJobs = jobs.filter(job => !job.start_date && !job.worker_id);

  // Get jobs for a specific day - SIMPLIFIED version for debugging
  const getDayJobs = (day: Date) => {
    return jobs.filter(job => {
      // Only check if job has start_date that matches this day
      if (!job.start_date) return false;
      
      const jobStart = parseISO(job.start_date);
      return isSameDay(jobStart, day);
    });
  };

  const handleJobDrop = async (job: Job, date: Date) => {
    if (!canEdit) return;
    
    try {
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

  // Debug count display
  const totalJobCount = jobs.length;
  const scheduledJobCount = jobs.filter(j => j.start_date).length;

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
          
          <div className="flex items-center gap-4">
            <div className="text-xs text-gray-500">
              {totalJobCount} job{totalJobCount !== 1 ? 's' : ''} total 
              ({scheduledJobCount} scheduled)
            </div>
            <button
              onClick={goToToday}
              className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Today
            </button>
          </div>
        </div>
        
        {/* Warning messages */}
        {jobs.length === 0 && (
          <div className="p-4 bg-yellow-50 border-b border-yellow-200">
            <p className="text-yellow-800 font-medium">No jobs found in database. Add jobs to start scheduling.</p>
          </div>
        )}
        
        {/* Debug info panel */}
        <div className="p-2 bg-gray-50 border-b border-gray-200 text-sm flex justify-between items-center">
          <div>
            <span className="font-medium">Total jobs:</span> {jobs.length} | 
            <span className="font-medium ml-2">Unscheduled:</span> {unscheduledJobs.length}
          </div>
          <button
            onClick={() => fetchJobs()}
            className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
          >
            Refresh Data
          </button>
        </div>
        
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
        jobs={jobs} // Pass ALL jobs to check if filtering is the issue
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

  // Show a "more" button if there are too many jobs to display
  const visibleRows = 2; // Number of rows to display before showing "more" button
  const totalJobs = jobs.length;
  const hasMoreJobs = totalJobs > visibleRows;
  
  // Always show job count for debugging
  const jobCount = jobs.length;

  return (
    <div 
      ref={drop}
      className={`
        flex flex-col relative h-[100px]
        ${!isInCurrentMonth ? 'bg-gray-50 text-gray-400' : 'bg-white'}
        ${isToday(day) ? 'bg-blue-50' : ''}
        ${isOver ? 'bg-blue-100' : ''}
      `}
    >
      <div className="flex justify-between items-center px-1.5 py-0.5 text-xs font-medium border-b border-gray-100">
        {format(day, 'd')}
        {/* Always show job count in top-right */}
        {jobCount > 0 && (
          <span className="bg-gray-100 text-gray-600 text-xs px-1 rounded">
            {jobCount}
          </span>
        )}
      </div>
      
      {/* Container for jobs */}
      <div className="flex-1 p-0.5 mt-0.5 overflow-hidden">
        {jobs.slice(0, visibleRows).map((job, index) => (
          <div 
            key={job.id}
            className="mb-0.5 h-6"
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
            +{totalJobs - visibleRows} more
          </button>
        )}
      </div>
    </div>
  );
};

export default MonthView;