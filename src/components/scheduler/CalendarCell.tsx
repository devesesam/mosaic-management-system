import React from 'react';
import { format, isSameDay, parseISO } from 'date-fns';
import { useDrop } from 'react-dnd';
import { Job } from '../../types';
import DraggableJob from './DraggableJob';

interface CalendarCellProps {
  workerId: string | null;
  day: Date;
  days: Date[];
  jobs: Job[];
  onJobDrop: (job: Job, workerId: string | null, date: Date) => void;
  onJobClick: (job: Job) => void;
  onJobResize: (job: Job, days: number) => void;
  onShowMore: (date: Date) => void;
  readOnly?: boolean;
  currentRowWorkerId: string | null;
  isUnassignedRow?: boolean;
}

const CalendarCell: React.FC<CalendarCellProps> = ({
  workerId,
  day,
  days,
  jobs,
  onJobDrop,
  onJobClick,
  onJobResize,
  onShowMore,
  readOnly = false,
  currentRowWorkerId,
  isUnassignedRow = false
}) => {
  const [{ isOver }, drop] = useDrop({
    accept: 'JOB',
    drop: (item: { job: Job }) => {
      onJobDrop(item.job, workerId, day);
    },
    collect: monitor => ({
      isOver: !!monitor.isOver()
    }),
    canDrop: () => !readOnly
  });

  // Current day index in the week
  const dayIndex = days.findIndex(d => isSameDay(d, day));
  
  // CRITICAL FIX: Ensure we ONLY work with jobs for the current worker
  // This should be redundant since getWorkerDayJobs should already filter,
  // but we'll be extra explicit to eliminate any edge cases
  const strictlyFilteredJobs = jobs.filter(job => {
    if (currentRowWorkerId === null) {
      // For unassigned row: only truly unassigned jobs
      return !job.worker_id && (!job.secondary_worker_ids || job.secondary_worker_ids.length === 0);
    } else {
      // For worker rows: only jobs where this worker is primary or secondary
      return job.worker_id === currentRowWorkerId || 
             (job.secondary_worker_ids && job.secondary_worker_ids.includes(currentRowWorkerId));
    }
  });
  
  console.log(`CalendarCell DEBUG [${format(day, 'MMM dd')} - Worker: ${currentRowWorkerId || 'Unassigned'}]:`, {
    originalJobsCount: jobs.length,
    filteredJobsCount: strictlyFilteredJobs.length,
    jobIds: strictlyFilteredJobs.map(j => j.id),
    currentRowWorkerId,
    dayIndex,
    isUnassignedRow
  });
  
  // Sort jobs by priority: put editable jobs first, then secondary assignments
  const sortedJobs = [...strictlyFilteredJobs].sort((a, b) => {
    // Check if jobs are secondary assignments for current worker
    const aIsSecondary = currentRowWorkerId !== null && 
                         a.worker_id !== currentRowWorkerId &&
                         a.secondary_worker_ids?.includes(currentRowWorkerId);
    const bIsSecondary = currentRowWorkerId !== null && 
                         b.worker_id !== currentRowWorkerId &&
                         b.secondary_worker_ids?.includes(currentRowWorkerId);
    
    // Primary jobs come before secondary jobs
    if (!aIsSecondary && bIsSecondary) return -1;
    if (aIsSecondary && !bIsSecondary) return 1;
    
    // Within same category, prioritize jobs with both dates
    const aHasBothDates = !!(a.start_date && a.end_date);
    const bHasBothDates = !!(b.start_date && b.end_date);
    
    if (aHasBothDates && !bHasBothDates) return -1;
    if (!aHasBothDates && bHasBothDates) return 1;
    
    // Finally sort by creation date
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
  
  console.log(`CalendarCell RENDER [${format(day, 'MMM dd')} - Worker: ${currentRowWorkerId || 'Unassigned'}]:`, {
    isUnassignedRow,
    totalJobsForWorker: strictlyFilteredJobs.length,
    sortedJobsCount: sortedJobs.length,
    jobsToRender: sortedJobs.map(j => ({ id: j.id, address: j.address }))
  });
  
  return (
    <div
      ref={drop}
      data-date={format(day, 'yyyy-MM-dd')}
      className={`
        w-[calc((100%-12rem)/7)] border-r border-gray-200 relative
        ${isOver && !readOnly ? 'bg-blue-50' : 'bg-white'}
        ${readOnly ? 'cursor-default' : ''}
      `}
      style={{ 
        height: isUnassignedRow ? 'auto' : '100px',
        minHeight: '100px'
      }}
    >
      {isUnassignedRow ? (
        // For unassigned row: show ALL jobs stacked vertically like MonthView
        <div className="flex flex-col p-1 space-y-1">
          {strictlyFilteredJobs.map((job) => (
            <DraggableJob
              key={job.id}
              job={job}
              onClick={() => onJobClick(job)}
              isScheduled={true}
              isWeekView={true}
              showText={true}
              readOnly={readOnly}
              days={days}
              dayIndex={dayIndex}
              isUnassignedWeekViewJob={true}
            />
          ))}
        </div>
      ) : (
        // For worker rows: keep existing single job logic
        <div className="h-full relative p-1">
          {sortedJobs[0] && (
            <div className="absolute left-0 right-0 top-0 mx-1 mt-1 h-[calc(100%-6px)]">
              <DraggableJob
                job={sortedJobs[0]}
                onClick={() => onJobClick(sortedJobs[0])}
                isScheduled={true}
                onResize={onJobResize ? (days) => onJobResize(sortedJobs[0], days) : undefined}
                isWeekView={true}
                showText={true}
                readOnly={readOnly}
                days={days}
                dayIndex={dayIndex}
              />
            </div>
          )}
          
          {sortedJobs.length > 1 && (
            <button
              onClick={() => onShowMore(day)}
              className="absolute bottom-1 right-2 text-xs text-black hover:text-gray-700 hover:underline z-10"
            >
              +{sortedJobs.length - 1} more
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default React.memo(CalendarCell);