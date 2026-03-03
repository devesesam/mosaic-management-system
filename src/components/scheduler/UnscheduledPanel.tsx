import React, { useState, useMemo } from 'react';
import { useDrop } from 'react-dnd';
import { Task } from '../../types';
import DraggableTask from './DraggableTask';
import { Search, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface UnscheduledPanelProps {
  tasks: Task[];
  onTaskDrop: (task: Task, workerId: string | null, date: Date | null) => void;
  onTaskClick: (task: Task) => void;
  readOnly?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const UnscheduledPanel: React.FC<UnscheduledPanelProps> = ({
  tasks,
  onTaskDrop,
  onTaskClick,
  readOnly = false,
  isCollapsed = false,
  onToggleCollapse
}) => {
  const { currentWorker } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedColor, setSelectedColor] = useState<string | null>(null);

  const [{ isOver }, drop] = useDrop({
    accept: 'TASK',
    drop: (item: { task: Task }) => {
      onTaskDrop(item.task, null, null);
    },
    collect: monitor => ({
      isOver: !!monitor.isOver()
    }),
    canDrop: () => !readOnly
  });

  // First filter unscheduled tasks (tasks without a start date need scheduling)
  const baseUnscheduledTasks = useMemo(() => {
    return tasks.filter(task => !task.start_date);
  }, [tasks]);

  // Filter for read-only mode: only show tasks assigned to current worker or unassigned
  const unscheduledTasks = useMemo(() => {
    if (readOnly && currentWorker) {
      // In read-only mode, show unscheduled tasks that are either:
      // 1. Unassigned (no worker)
      // 2. Assigned to current worker
      return tasks.filter(task =>
        !task.start_date && (!task.worker_id || task.worker_id === currentWorker.id)
      );
    }

    // For admin users, show all unscheduled tasks
    return baseUnscheduledTasks;
  }, [tasks, readOnly, currentWorker, baseUnscheduledTasks]);

  // Get unique tile colors from unscheduled tasks only
  const uniqueColors = useMemo(() => {
    const colors = new Set(unscheduledTasks.map(task => task.tile_color).filter(Boolean));
    return Array.from(colors) as string[];
  }, [unscheduledTasks]);

  // Filter tasks based on search term and selected color
  const filteredTasks = useMemo(() => {
    return unscheduledTasks.filter(task => {
      const matchesSearch = searchTerm === '' ||
        task.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.notes?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesColor = !selectedColor || task.tile_color === selectedColor;

      return matchesSearch && matchesColor;
    });
  }, [unscheduledTasks, searchTerm, selectedColor]);

  console.log('UnscheduledPanel: Filter logic:', {
    readOnly,
    currentWorkerId: currentWorker?.id,
    totalTasks: tasks.length,
    baseUnscheduled: baseUnscheduledTasks.length,
    filteredUnscheduled: unscheduledTasks.length,
    finalFiltered: filteredTasks.length
  });

  // Collapsed state - show just a toggle button
  if (isCollapsed) {
    return (
      <div className="hidden md:flex border-l border-gray-200 bg-vanilla flex-col items-center py-2">
        <button
          onClick={onToggleCollapse}
          className="p-2 rounded-full hover:bg-garlic transition-colors"
          title="Show Tasks to Schedule"
        >
          <ChevronLeft className="h-5 w-5 text-charcoal" />
        </button>
        <div className="mt-2 writing-mode-vertical text-xs text-gray-500 font-medium" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>
          Tasks ({filteredTasks.length})
        </div>
      </div>
    );
  }

  return (
    <div className="hidden md:flex w-[200px] min-w-[200px] border-l border-gray-200 bg-vanilla flex-col">
      <div className="p-3 font-semibold text-charcoal border-b border-gray-200 bg-garlic flex items-center justify-between">
        <span>Tasks to Schedule ({filteredTasks.length})</span>
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="p-1 rounded hover:bg-vanilla transition-colors"
            title="Hide Tasks to Schedule"
          >
            <ChevronRight className="h-4 w-4 text-charcoal" />
          </button>
        )}
      </div>

      {/* Search and filters */}
      <div className="p-3 border-b border-gray-200 space-y-3">
        {/* Search input */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            disabled={readOnly}
            className={`w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-margaux focus:border-margaux ${
              readOnly ? 'bg-gray-100 cursor-not-allowed' : ''
            }`}
          />
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          {searchTerm && !readOnly && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-2.5 text-gray-400 hover:text-charcoal"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Color filter */}
        {uniqueColors.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">
              Filter by color
            </label>
            <div className="flex flex-wrap gap-1">
              {uniqueColors.map((color) => (
                <button
                  key={color}
                  onClick={() => !readOnly && setSelectedColor(selectedColor === color ? null : color)}
                  disabled={readOnly}
                  className={`w-5 h-5 rounded-full transition-transform ${
                    readOnly
                      ? 'cursor-not-allowed opacity-50'
                      : 'hover:scale-110 cursor-pointer'
                  } ${
                    selectedColor === color ? 'ring-2 ring-offset-1 ring-gray-400' : ''
                  }`}
                  style={{ backgroundColor: color }}
                  title={readOnly ? 'Read-only mode' : 'Filter by this color'}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tasks list */}
      <div
        ref={drop}
        className={`flex-1 p-2 overflow-y-auto ${isOver && !readOnly ? 'bg-sorbet/30' : ''}`}
      >
        {filteredTasks.length === 0 ? (
          <div className="p-3 text-sm text-gray-500 italic">
            {unscheduledTasks.length === 0 ? 'No unscheduled tasks' : 'No tasks match the filters'}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredTasks.map(task => (
              <DraggableTask
                key={task.id}
                task={task}
                onClick={() => onTaskClick(task)}
                isScheduled={false}
                readOnly={readOnly}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UnscheduledPanel;
