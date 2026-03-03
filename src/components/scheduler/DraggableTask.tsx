import React, { useRef, useState, useCallback, memo } from 'react';
import { useDrag } from 'react-dnd';
import { Task } from '../../types';
import { TaskTile } from '../tasks';

interface DraggableTaskProps {
  task: Task;
  onClick: () => void;
  isScheduled?: boolean;
  onResize?: (task: Task, days: number) => void;
  isWeekView?: boolean;
  showText?: boolean;
  days?: Date[];
  dayIndex?: number;
  span?: number;
  readOnly?: boolean;
}

const DraggableTask: React.FC<DraggableTaskProps> = ({
  task,
  onClick,
  isScheduled = true,
  onResize,
  isWeekView = false,
  showText = true,
  days,
  dayIndex,
  span,
  readOnly = false
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isResizing, setIsResizing] = useState(false);

  const [{ isDragging }, drag] = useDrag({
    type: 'TASK',
    item: { task },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging()
    }),
    canDrag: () => !isResizing && !readOnly
  });

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    if (!onResize || !isScheduled || !ref.current?.parentElement || readOnly) return;

    e.preventDefault();
    e.stopPropagation();

    setIsResizing(true);

    const startX = e.clientX;
    const parentElement = ref.current.parentElement;
    const startRect = parentElement.getBoundingClientRect();
    const originalWidth = startRect.width;

    // Get cell width from the calendar grid - use a more specific selector
    const gridContainer = parentElement.closest('.min-w-fit');
    const cellElements = gridContainer?.querySelectorAll('[data-date]');

    if (!cellElements || cellElements.length === 0) {
      console.warn('No grid cells found for resize calculation');
      setIsResizing(false);
      return;
    }

    const firstCell = cellElements[0] as HTMLElement;
    const cellRect = firstCell.getBoundingClientRect();
    const cellWidth = cellRect.width;

    if (cellWidth <= 0) {
      console.warn('Invalid cell width for resize:', cellWidth);
      setIsResizing(false);
      return;
    }

    // Calculate initial days from current width
    const initialDays = Math.max(1, Math.round(originalWidth / cellWidth));

    console.log('DraggableTask: Resize start:', {
      task_id: task.id,
      startX,
      originalWidth,
      cellWidth,
      initialDays,
      calculation: `${originalWidth} / ${cellWidth} = ${originalWidth / cellWidth}`
    });

    const handleMouseMove = (e: MouseEvent) => {
      if (!parentElement) return;

      const currentX = e.clientX;
      const deltaX = currentX - startX;

      // Calculate how many cells we've moved (can be negative for shrinking)
      const cellsMoved = Math.round(deltaX / cellWidth);
      const newDays = Math.max(1, initialDays + cellsMoved);

      // Calculate the new width in pixels
      const newWidthPx = newDays * cellWidth - 8; // Subtract margin

      // Update visual width immediately
      parentElement.style.width = `${newWidthPx}px`;
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!parentElement) return;

      const currentX = e.clientX;
      const deltaX = currentX - startX;

      // Use the same calculation as in mousemove for consistency
      const cellsMoved = Math.round(deltaX / cellWidth);
      const finalDays = Math.max(1, initialDays + cellsMoved);

      console.log('DraggableTask: Resize end:', {
        task_id: task.id,
        startX,
        currentX,
        deltaX,
        cellWidth,
        initialDays,
        cellsMoved,
        finalDays,
        changed: finalDays !== initialDays
      });

      setIsResizing(false);

      // Reset the style and let the layout handle the width
      parentElement.style.width = '';

      // Only call onResize if the size actually changed
      if (finalDays !== initialDays) {
        console.log('DraggableTask: Calling onResize with', finalDays, 'days');
        onResize(task, finalDays);
      } else {
        console.log('DraggableTask: No size change, not calling onResize');
      }

      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [isScheduled, task, onResize, readOnly]);

  if (!readOnly) {
    drag(ref);
  }

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
      `}
      style={{
        position: 'relative',
        width: isScheduled ? '100%' : 'auto',
        height: isWeekView && isScheduled ? '100%' : isScheduled ? '22px' : 'auto',
        cursor: isResizing ? 'ew-resize' : readOnly ? 'pointer' : isDragging ? 'grabbing' : 'grab',
        userSelect: 'none',
        WebkitUserSelect: 'none'
      }}
    >
      <TaskTile
        task={task}
        isDragging={isDragging}
        onClick={onClick}
        isScheduled={isScheduled}
        isWeekView={isWeekView}
        showText={showText}
      />

      {/* Resize handle - only show if not read-only and resizing is available */}
      {isScheduled && onResize && !readOnly && (
        <div
          className="absolute right-0 top-0 h-full w-3 cursor-ew-resize hover:bg-white hover:bg-opacity-30 z-20 flex items-center justify-end pr-1"
          onMouseDown={handleResizeStart}
          onClick={(e) => e.stopPropagation()}
          title="Drag to resize task duration"
        >
          <div className="w-0.5 h-4 bg-white bg-opacity-70 rounded-full"></div>
        </div>
      )}
    </div>
  );
};

export default memo(DraggableTask);

// Backwards compatibility - export as DraggableJob too
export { DraggableTask as DraggableJob };
