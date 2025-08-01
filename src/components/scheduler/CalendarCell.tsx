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
  
  // Use jobs prop directly - it should already be filtered by parent component
  console.log(`CalendarCell [${format(day, 'MMM dd')} - ${isUnassignedRow ? 'Unassigned' : `Worker: ${currentRowWorkerId}`}]:`, {
    isUnassignedRow,
    jobCount: jobs.length,
    jobIds: jobs.map(j => j.id),
    dayIndex
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
        // For unassigned row: show ALL jobs stacked vertically
        <div className="flex flex-col p-1 space-y-1">
          {jobs.map((job) => (
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
          {jobs[0] && (
            <div className="absolute left-0 right-0 top-0 mx-1 mt-1 h-[calc(100%-6px)]">
              <DraggableJob
                job={jobs[0]}
                onClick={() => onJobClick(jobs[0])}
                isScheduled={true}
                onResize={onJobResize ? (days) => onJobResize(jobs[0], days) : undefined}
                isWeekView={true}
                showText={true}
                readOnly={readOnly}
                days={days}
                dayIndex={dayIndex}
              />
            </div>
          )}
          
          {jobs.length > 1 && (
            <button
              onClick={() => onShowMore(day)}
              className="absolute bottom-1 right-2 text-xs text-black hover:text-gray-700 hover:underline z-10"
            >
              +{jobs.length - 1} more
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default React.memo(CalendarCell);