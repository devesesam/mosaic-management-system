import React from 'react';
import { useDrop } from 'react-dnd';
import { format, isSameDay, isToday } from 'date-fns';
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
  currentRowWorkerId: string | null;
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
  currentRowWorkerId
}) => {
  // DEBUG: Add console logs to see what's happening
  console.log('CalendarCell DEBUG:', {
    day: format(day, 'yyyy-MM-dd'),
    currentRowWorkerId,
    workerId,
    jobsCount: jobs.length,
    isUnassignedRow: currentRowWorkerId === null
  });

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
  const isUnassignedRow = currentRowWorkerId === null;
  
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
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  // UNASSIGNED ROW: Stack all jobs vertically
  if (isUnassignedRow) {
    return (
      <div
        ref={drop}
        data-date={format(day, 'yyyy-MM-dd')}
        className={`
          w-[calc((100%-12rem)/7)] border-r border-gray-200 relative
          min-h-[100px]
          ${isOver && !readOnly ? 'bg-blue-50' : isToday(day) ? 'bg-blue-50/30' : 'bg-white'}
          ${readOnly ? 'cursor-default' : ''}
        `}
      >
        <div className="p-2 space-y-2">
          {sortedJobs.map((job) => (
            <div key={job.id} className="h-20">
              <DraggableJob
                job={job}
                onClick={() => onJobClick(job)}
                isScheduled={false}
                onResize={undefined}
                isWeekView={false}
                showText={true}
                readOnly={readOnly}
              />
            </div>
          ))}
          {sortedJobs.length === 0 && (
            <div className="h-20 flex items-center justify-center text-gray-400 text-sm">
              Drop jobs here
            </div>
          )}
        </div>
      </div>
    );
  }

  // WORKER ROWS: Keep existing single job display logic
  const mainJob = sortedJobs[0];
  const hasMoreJobs = sortedJobs.length > 1;
  const cellHeight = 100;

  return (
    <div
      ref={drop}
      data-date={format(day, 'yyyy-MM-dd')}
      className={`
        w-[calc((100%-12rem)/7)] border-r border-gray-200 relative
        ${isOver && !readOnly ? 'bg-blue-50' : isToday(day) ? 'bg-blue-50/30' : 'bg-white'}
        ${readOnly ? 'cursor-default' : ''}
      `}
      style={{ height: `${cellHeight}px` }}
    >
      <div className="h-full relative p-1">
        {/* Render single job for worker rows */}
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
        
        {/* Show "See All Jobs" button for worker rows with multiple jobs */}
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
};

export default React.memo(CalendarCell);