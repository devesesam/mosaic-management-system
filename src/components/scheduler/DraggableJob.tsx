import React, { useRef, useState } from 'react';
import { useDrag } from 'react-dnd';
import { Job } from '../../types';
import JobTile from '../jobs/JobTile';
import { useAuth } from '../../context/AuthContext';
import { parseISO, addDays } from 'date-fns';

interface DraggableJobProps {
  job: Job;
  onClick: () => void;
  isScheduled?: boolean;
  onResize?: (job: Job, days: number) => void;
  isWeekView?: boolean;
  showText?: boolean;
  readOnly?: boolean;
}

const DraggableJob: React.FC<DraggableJobProps> = ({ 
  job, 
  onClick, 
  isScheduled = true,
  onResize,
  isWeekView = false,
  showText = true,
  readOnly = false
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isResizing, setIsResizing] = useState(false);
  const { isAdmin } = useAuth();
  
  const canEdit = isAdmin && !readOnly;
  
  const [{ isDragging }, drag] = useDrag({
    type: 'JOB',
    item: { job },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    }),
    canDrag: () => !isResizing && canEdit
  });

  const handleResizeStart = (e: React.MouseEvent) => {
    if (!onResize || !isScheduled || !ref.current?.parentElement || !canEdit) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    setIsResizing(true);
    
    const startX = e.clientX;
    const parentElement = ref.current.parentElement;
    const originalWidth = parentElement.getBoundingClientRect().width;
    
    // Get cell width for calculations
    const gridCells = document.querySelectorAll('[data-date]');
    if (gridCells.length === 0) return;
    
    const cellWidth = (gridCells[0] as HTMLElement).getBoundingClientRect().width;
    if (cellWidth <= 0) return;
    
    const initialDays = Math.max(1, Math.round(originalWidth / cellWidth));
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!ref.current?.parentElement) return;
      
      const currentX = e.clientX;
      const diff = currentX - startX;
      
      // Calculate new days based on cursor movement
      const additionalDays = Math.round(diff / cellWidth);
      const newDays = Math.max(1, initialDays + additionalDays);
      
      // Update visual width
      ref.current.parentElement.style.width = `calc(${newDays} * 100% - 0.5rem)`;
    };

    const handleMouseUp = () => {
      if (!ref.current?.parentElement) return;

      setIsResizing(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      
      // Calculate final width in days
      const finalWidth = ref.current.parentElement.getBoundingClientRect().width;
      const finalDays = Math.max(1, Math.round(finalWidth / cellWidth));
      
      if (finalDays !== initialDays) {
        onResize(job, finalDays);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };
  
  drag(ref);
  
  return (
    <div 
      ref={ref} 
      className={`
        ${isDragging ? 'opacity-50' : 'opacity-100'}
        transition-all duration-200
        touch-none
        relative
        z-10
        ${isWeekView ? 'h-full' : ''}
        ${!canEdit ? 'cursor-default' : ''}
      `}
      style={{
        position: 'relative',
        width: isScheduled ? '100%' : 'auto',
        height: isWeekView && isScheduled ? '100%' : isScheduled ? '22px' : 'auto',
        cursor: isResizing ? 'ew-resize' : canEdit ? 'grab' : 'default',
        userSelect: 'none',
        WebkitUserSelect: 'none'
      }}
    >
      <JobTile 
        job={job} 
        isDragging={isDragging} 
        onClick={onClick}
        isScheduled={isScheduled}
        isWeekView={isWeekView}
        showText={showText}
      />
      
      {isScheduled && onResize && canEdit && (
        <div
          className="absolute right-0 top-0 h-full w-6 cursor-ew-resize hover:bg-gray-400/20 z-20"
          onMouseDown={handleResizeStart}
          onClick={(e) => e.stopPropagation()}
        />
      )}
    </div>
  );
};

export default DraggableJob;