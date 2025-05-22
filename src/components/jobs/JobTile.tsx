import React from 'react';
import { Job, JobStatus } from '../../types';

interface JobTileProps {
  job: Job;
  isDragging?: boolean;
  onClick?: () => void;
  isScheduled?: boolean;
  isWeekView?: boolean;
  showText?: boolean;
}

const JobTile: React.FC<JobTileProps> = ({ 
  job, 
  isDragging = false,
  onClick,
  isScheduled = true,
  isWeekView = false,
  showText = true
}) => {
  // Get the display color based on status
  const getTileColor = () => {
    return job.status === JobStatus.Closed ? '#94a3b8' : (job.tile_color || '#3b82f6');
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
          <div className="font-medium truncate">{job.address}</div>
          {isWeekView && isScheduled && job.customer_name && (
            <div className="text-xs truncate opacity-90 mt-1">
              {job.customer_name}
            </div>
          )}
          {!isScheduled && job.customer_name && (
            <div className="text-sm truncate opacity-90">
              {job.customer_name}
            </div>
          )}
          {!isScheduled && (
            <div className={`text-sm truncate ${isScheduled ? 'opacity-90' : 'text-gray-600'}`}>
              {job.status}
            </div>
          )}
        </div>
      ) : (
        <div className="h-full w-full"></div>
      )}
    </div>
  );
};

export default JobTile;