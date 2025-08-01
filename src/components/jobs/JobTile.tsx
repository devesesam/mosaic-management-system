import React from 'react';
import { Job, JobStatus } from '../../types';

interface JobTileProps {
  job: Job;
  isDragging?: boolean;
  onClick?: () => void;
  isScheduled?: boolean;
  isWeekView?: boolean;
  showText?: boolean;
  isUnassignedWeekViewJob?: boolean;
}

const JobTile: React.FC<JobTileProps> = ({ 
  job, 
  isDragging = false,
  onClick,
  isScheduled = true,
  isWeekView = false,
  showText = true,
  isUnassignedWeekViewJob = false
}) => {
  // Get the display color based on status
  const getTileColor = () => {
    return job.status === JobStatus.Closed ? '#94a3b8' : (job.tile_color || '#3b82f6');
  };
  
  // Determine effective styling - unassigned week view jobs should look like unscheduled jobs
  const effectiveIsScheduled = isScheduled && !isUnassignedWeekViewJob;
  
  return (
    <div 
      className={`
        ${isDragging ? 'opacity-50' : 'opacity-100'}
        ${effectiveIsScheduled ? 'p-1' : 'p-3 mb-2'}
        rounded-md shadow-sm
        hover:shadow-md transition-all duration-200
        overflow-hidden
        ${onClick ? 'cursor-pointer' : ''}
        flex flex-col justify-between
        ${isWeekView && effectiveIsScheduled ? 'h-full' : effectiveIsScheduled ? 'h-[22px]' : 'min-h-[80px]'}
      `}
      style={{
        backgroundColor: effectiveIsScheduled ? getTileColor() : 'white',
        borderLeft: effectiveIsScheduled ? 'none' : `4px solid ${getTileColor()}`
      }}
      onClick={onClick}
    >
      {showText ? (
        <div className={`${effectiveIsScheduled ? 'text-white' : 'text-gray-800'} ${!isWeekView && effectiveIsScheduled ? 'text-xs' : ''}`}>
          <div className="font-medium truncate">{job.address}</div>
          {isWeekView && effectiveIsScheduled && job.customer_name && (
            <div className="text-xs truncate opacity-90 mt-1">
              {job.customer_name}
            </div>
          )}
          {!effectiveIsScheduled && job.customer_name && (
            <div className="text-sm truncate opacity-90">
              {job.customer_name}
            </div>
          )}
          {!effectiveIsScheduled && (
            <div className={`text-sm truncate ${effectiveIsScheduled ? 'opacity-90' : 'text-gray-600'}`}>
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