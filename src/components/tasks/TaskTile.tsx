import React from 'react';
import { Task, TaskStatus } from '../../types';

interface TaskTileProps {
  task: Task;
  isDragging?: boolean;
  onClick?: () => void;
  isScheduled?: boolean;
  isWeekView?: boolean;
  showText?: boolean;
}

const TaskTile: React.FC<TaskTileProps> = ({
  task,
  isDragging = false,
  onClick,
  isScheduled = true,
  isWeekView = false,
  showText = true
}) => {
  // Get the display color based on status
  const getTileColor = () => {
    return task.status === TaskStatus.Completed ? '#94a3b8' : (task.tile_color || '#345981');
  };

  return (
    <div
      className={`
        ${isDragging ? 'opacity-50' : 'opacity-100'}
        ${isScheduled ? 'p-1' : 'p-3 mb-2'}
        rounded-md shadow-sm
        hover:shadow-md transition-all duration-200
        overflow-hidden
        ${onClick ? 'cursor-pointer' : ''}
        flex flex-col justify-between
        ${isWeekView && isScheduled ? 'h-full' : isScheduled ? 'h-[22px]' : 'min-h-[80px]'}
      `}
      style={{
        backgroundColor: isScheduled ? getTileColor() : 'white',
        borderLeft: isScheduled ? 'none' : `4px solid ${getTileColor()}`
      }}
      onClick={onClick}
    >
      {showText ? (
        <div className={`${isScheduled ? 'text-white' : 'text-gray-800'} ${!isWeekView && isScheduled ? 'text-xs' : ''}`}>
          <div className="font-medium truncate">{task.name}</div>
          {!isScheduled && (
            <div className={`text-sm truncate ${isScheduled ? 'opacity-90' : 'text-gray-600'}`}>
              {task.status}
            </div>
          )}
        </div>
      ) : (
        <div className="h-full w-full"></div>
      )}
    </div>
  );
};

export default TaskTile;
