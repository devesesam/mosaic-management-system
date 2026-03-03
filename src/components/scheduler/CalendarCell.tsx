import React from 'react';
import { format, isSameDay } from 'date-fns';
import { useDrop } from 'react-dnd';
import { Task } from '../../types';
import DraggableTask from './DraggableTask';

interface CalendarCellProps {
  workerId: string | null;
  day: Date;
  days: Date[];
  tasks: Task[];
  onTaskDrop: (task: Task, workerId: string | null, date: Date) => void;
  onTaskClick: (task: Task) => void;
  onTaskResize: (task: Task, days: number) => void;
  onShowMore: (date: Date) => void;
  readOnly?: boolean;
}

const CalendarCell: React.FC<CalendarCellProps> = ({
  workerId,
  day,
  days,
  tasks,
  onTaskDrop,
  onTaskClick,
  onTaskResize,
  onShowMore,
  readOnly = false
}) => {
  const [{ isOver }, drop] = useDrop({
    accept: 'TASK',
    drop: (item: { task: Task }) => {
      onTaskDrop(item.task, workerId, day);
    },
    collect: monitor => ({
      isOver: !!monitor.isOver()
    }),
    canDrop: () => !readOnly
  });

  // Current day index in the week
  const dayIndex = days.findIndex(d => isSameDay(d, day));

  // Sort tasks so most important shows on top
  const sortedTasks = [...tasks].sort((a, b) => {
    // Prioritize tasks with both start and end dates
    const aHasBothDates = !!(a.start_date && a.end_date);
    const bHasBothDates = !!(b.start_date && b.end_date);

    if (aHasBothDates && !bHasBothDates) return -1;
    if (!aHasBothDates && bHasBothDates) return 1;

    // If both have dates or both don't, sort by created date (newest first)
    return b.created_at.localeCompare(a.created_at);
  });

  const mainTask = sortedTasks[0];
  const hasMoreTasks = sortedTasks.length > 1;

  return (
    <div
      ref={drop}
      data-date={format(day, 'yyyy-MM-dd')}
      className={`
        w-[calc((100%-12rem)/7)] border-r border-gray-200 relative
        ${isOver ? 'bg-sorbet/30' : 'bg-white'}
        ${readOnly ? 'cursor-default' : ''}
      `}
      style={{ height: '100px' }}
    >
      <div className="h-full relative p-1">
        {mainTask && (
          <div className="absolute left-0 right-0 top-0 mx-1 mt-1 h-[calc(100%-6px)]">
            <DraggableTask
              task={mainTask}
              onClick={() => onTaskClick(mainTask)}
              isScheduled={true}
              onResize={(task, days) => onTaskResize(mainTask, days)}
              isWeekView={true}
              showText={true}
              readOnly={readOnly}
              days={days}
              dayIndex={dayIndex}
            />
          </div>
        )}

        {hasMoreTasks && (
          <button
            onClick={() => onShowMore(day)}
            className="absolute bottom-1 right-2 text-xs text-gray-500 hover:text-charcoal hover:underline z-10"
          >
            +{sortedTasks.length - 1} more
          </button>
        )}
      </div>
    </div>
  );
};

export default React.memo(CalendarCell);
