import React, { useState, useMemo } from 'react';
import { useDrop } from 'react-dnd';
import { Job } from '../../types';
import DraggableJob from './DraggableJob';
import { Search, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface UnscheduledPanelProps {
  jobs: Job[];
  onJobDrop: (job: Job, workerId: string | null, date: Date | null) => void;
  onJobClick: (job: Job) => void;
  readOnly?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const UnscheduledPanel: React.FC<UnscheduledPanelProps> = ({
  jobs,
  onJobDrop,
  onJobClick,
  readOnly = false,
  isCollapsed = false,
  onToggleCollapse
}) => {
  const { currentWorker } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedColor, setSelectedColor] = useState<string | null>(null);

  const [{ isOver }, drop] = useDrop({
    accept: 'JOB',
    drop: (item: { job: Job }) => {
      onJobDrop(item.job, null, null);
    },
    collect: monitor => ({
      isOver: !!monitor.isOver()
    }),
    canDrop: () => !readOnly
  });

  // First filter unscheduled jobs
  const baseUnscheduledJobs = useMemo(() => {
    return jobs.filter(job => !job.start_date && !job.worker_id);
  }, [jobs]);

  // Filter for read-only mode: only show jobs assigned to current worker or unassigned
  const unscheduledJobs = useMemo(() => {
    if (readOnly && currentWorker) {
      // In read-only mode, show jobs that are either:
      // 1. Completely unassigned (no worker, no date)
      // 2. Assigned to current worker but no date
      return jobs.filter(job => 
        (!job.start_date && !job.worker_id) || 
        (!job.start_date && job.worker_id === currentWorker.id)
      );
    }
    
    // For admin users, show all unscheduled jobs
    return baseUnscheduledJobs;
  }, [jobs, readOnly, currentWorker, baseUnscheduledJobs]);

  // Get unique tile colors from unscheduled jobs only
  const uniqueColors = useMemo(() => {
    const colors = new Set(unscheduledJobs.map(job => job.tile_color).filter(Boolean));
    return Array.from(colors) as string[];
  }, [unscheduledJobs]);

  // Filter jobs based on search term and selected color
  const filteredJobs = useMemo(() => {
    return unscheduledJobs.filter(job => {
      const matchesSearch = searchTerm === '' || 
        job.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.address.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesColor = !selectedColor || job.tile_color === selectedColor;
      
      return matchesSearch && matchesColor;
    });
  }, [unscheduledJobs, searchTerm, selectedColor]);

  console.log('UnscheduledPanel: Filter logic:', {
    readOnly,
    currentWorkerId: currentWorker?.id,
    totalJobs: jobs.length,
    baseUnscheduled: baseUnscheduledJobs.length,
    filteredUnscheduled: unscheduledJobs.length,
    finalFiltered: filteredJobs.length
  });
  
  // Collapsed state - show just a toggle button
  if (isCollapsed) {
    return (
      <div className="hidden md:flex border-l border-gray-200 bg-gray-50 flex-col items-center py-2">
        <button
          onClick={onToggleCollapse}
          className="p-2 rounded-full hover:bg-gray-200 transition-colors"
          title="Show Jobs to Schedule"
        >
          <ChevronLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div className="mt-2 writing-mode-vertical text-xs text-gray-500 font-medium" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>
          Jobs ({filteredJobs.length})
        </div>
      </div>
    );
  }

  return (
    <div className="hidden md:flex w-[200px] min-w-[200px] border-l border-gray-200 bg-gray-50 flex-col">
      <div className="p-3 font-semibold text-gray-800 border-b border-gray-200 bg-gray-100 flex items-center justify-between">
        <span>Jobs to Schedule ({filteredJobs.length})</span>
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="p-1 rounded hover:bg-gray-200 transition-colors"
            title="Hide Jobs to Schedule"
          >
            <ChevronRight className="h-4 w-4 text-gray-600" />
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
            className={`w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 ${
              readOnly ? 'bg-gray-100 cursor-not-allowed' : ''
            }`}
          />
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          {searchTerm && !readOnly && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Color filter */}
        {uniqueColors.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
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

      {/* Jobs list */}
      <div 
        ref={drop}
        className={`flex-1 p-2 overflow-y-auto ${isOver && !readOnly ? 'bg-blue-50' : ''}`}
      >
        {filteredJobs.length === 0 ? (
          <div className="p-3 text-sm text-gray-500 italic">
            {unscheduledJobs.length === 0 ? 'No unscheduled jobs' : 'No jobs match the filters'}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredJobs.map(job => (
              <DraggableJob
                key={job.id}
                job={job}
                onClick={() => onJobClick(job)}
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