import React from 'react';
import { format, isSameDay, parseISO } from 'date-fns';
import { useDrop } from 'react-dnd';
import { Job } from '../../types';
import DraggableJob from './DraggableJob';
import { useDragContext } from '../../context/DragContext';

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
  const { isDragging: globalIsDragging } = useDragContext();
  
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
  
  const mainJob = sortedJobs[0];
  const hasMoreJobs = sortedJobs.length > 1;

  return (
    <div
      ref={drop}
      data-date={format(day, 'yyyy-MM-dd')}
      className={`
        w-[calc((100%-12rem)/7)] border-r border-gray-200 relative
        ${isOver ? 'bg-blue-50' : 'bg-white'}
        ${readOnly ? 'cursor-default' : ''}
        ${globalIsDragging ? 'z-20' : 'z-10'}
      `}
      style={{ 
        height: '100px',
        // Ensure drop zone is always interactive during drag
        pointerEvents: globalIsDragging ? 'auto' : 'auto'
      }}
    >
      <div className="h-full relative p-1">
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
        
        {hasMoreJobs && (
          <button
            onClick={() => onShowMore(day)}
            className="absolute bottom-1 right-2 text-xs text-gray-500 hover:text-gray-700 hover:underline z-30"
            style={{
              // Ensure "more" button is always clickable
              pointerEvents: 'auto'
            }}
          >
            +{sortedJobs.length - 1} more
          </button>
        )}
      </div>
    </div>
  );
};

export default React.memo(CalendarCell);