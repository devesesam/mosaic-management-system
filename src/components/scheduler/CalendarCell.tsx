  import React from 'react';
import { Job } from '../../types';
import DraggableJob from './DraggableJob';

interface CalendarCellProps {
  workerId: string | null;
  day: Date;
  days: Date[];
  jobs: Job[];
  onJobDrop: (job: Job, workerId: string | null, day: Date) => void;
  onJobClick: (job: Job) => void;
  onJobResize: (job: Job, days: number) => void;
  onShowMore: (date: Date) => void;
  readOnly?: boolean;
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
  readOnly = false
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

  // Check if this is the unassigned row
  const isUnassignedRow = workerId === null;

  // Current day index in the week
  const dayIndex = days.findIndex(d => isSameDay(d, day));
  
  // Sort jobs so most important shows on top
  const sortedJobs = [...jobs].sort((a, b) => {
    // Prioritize jobs with both start and end dates
    const aHasBothDates = !!(a.start_date && a.end_date);
    const bHasBothDates = !!(b.start_date && b.end_date);
    
    if (aHasBothDates && !bHasBothDates) return -1;
    if (!aHasBothDates && bHasBothDates) return 1;
    
    // If both have dates or both don't, sort by created date (newest first)
    return b.created_at.localeCompare(a.created_at);
  });
  
  const mainJob = isUnassignedRow ? null : sortedJobs[0];
  // SIMPLIFIED LOGIC: Show "See All Jobs" if there are any jobs on this day (only for worker rows)
  const hasJobs = !isUnassignedRow && jobs.length > 0;
  const hasMoreJobs = sortedJobs.length > 1;
  const cellHeight = isUnassignedRow ? 'auto' : 100;

  // Only do spanning logic for worker rows (not unassigned row)
  if (!isUnassignedRow && mainJob && mainJob.start_date && mainJob.end_date) {
    // existing spanning logic
  }

  return (
    <div
      ref={drop}
      data-date={format(day, 'yyyy-MM-dd')}
      className={`
        w-[calc((100%-12rem)/7)] border-r border-gray-200 relative ${
          isUnassignedRow ? 'h-auto' : ''
        }
        ${isOver ? 'bg-blue-50' : 'bg-white'}
        ${readOnly ? 'cursor-default' : ''}
      `}
      style={isUnassignedRow ? {} : { height: `${cellHeight}px` }}
    >
      <div className={isUnassignedRow ? "p-1 flex flex-col space-y-1" : "h-full relative p-1"}>
        {/* Render jobs for unassigned row (stacked) */}
        {isUnassignedRow && sortedJobs.map((job) => (
          <div key={job.id} className="relative" style={{ height: '80px' }}>
            <DraggableJob
              job={job}
              onClick={() => onJobClick(job)}
              isScheduled={true}
              onResize={undefined} // Disable resizing for unassigned jobs
              isWeekView={false} // Use Month View styling
              showText={true}
              dayIndex={dayIndex}
              days={days}
              readOnly={readOnly}
            />
          </div>
        ))}
        
        {/* Render single job for worker rows (existing logic) */}
        {mainJob && (
          <div className="absolute left-0 right-0 top-0 mx-1 mt-1 h-[calc(100%-6px)]">
            <DraggableJob
              job={mainJob}
              onClick={() => onJobClick(mainJob)}
              isScheduled={true}
              onResize={(days) => onJobResize(mainJob, days)}
              isWeekView={true}
              showText={true}
              readOnly={readOnly}
              days={days}
              dayIndex={dayIndex}
            />
          </div>
        )}
        {/* Show "See All Jobs" button only for worker rows */}
        {hasMoreJobs && (
          <button
            onClick={() => onShowMore(day)}
            className="absolute bottom-1 right-2 text-xs text-gray-500 hover:text-gray-700 hover:underline z-10"
          >
            +{sortedJobs.length - 1} more
          </button>
        )}
      </div>
    </div>
  );
  // For worker rows, use the existing mainJob logic
};
  // For unassigned row, we'll render all jobs
export default React.memo(CalendarCell);