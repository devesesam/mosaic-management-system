import React, { useState, useMemo } from 'react';
import { useDrop } from 'react-dnd';
import { Job } from '../../types';
import DraggableJob from './DraggableJob';
import { Search, X } from 'lucide-react';

interface UnscheduledPanelProps {
  jobs: Job[];
  onJobDrop: (job: Job, workerId: string | null, date: Date | null) => void;
  onJobClick: (job: Job) => void;
  readOnly?: boolean;
}

const UnscheduledPanel: React.FC<UnscheduledPanelProps> = ({
  jobs,
  onJobDrop,
  onJobClick,
  readOnly = false
}) => {
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
  const unscheduledJobs = useMemo(() => {
    return jobs.filter(job => !job.start_date && !job.worker_id);
  }, [jobs]);

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
  
  // Debug counts
  const totalJobs = jobs.length;
  const unscheduledCount = unscheduledJobs.length;
  const filteredCount = filteredJobs.length;
  
  return (
    <div className="w-[200px] min-w-[200px] border-l border-gray-200 bg-gray-50 flex flex-col">
      <div className="p-3 font-semibold text-gray-800 border-b border-gray-200 bg-gray-100">
        Jobs to Schedule ({filteredJobs.length})
      </div>

      {/* Debug counts - always show this */}
      <div className="px-2 py-1 bg-blue-50 text-xs text-blue-700 border-b border-blue-100">
        Total jobs: {totalJobs} | Unscheduled: {unscheduledCount} | Filtered: {filteredCount}
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
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
          />
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          {searchTerm && (
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
                  onClick={() => setSelectedColor(selectedColor === color ? null : color)}
                  className={`w-5 h-5 rounded-full transition-transform hover:scale-110 ${
                    selectedColor === color ? 'ring-2 ring-offset-1 ring-gray-400' : ''
                  }`}
                  style={{ backgroundColor: color }}
                  title="Filter by this color"
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
        {jobs.length === 0 ? (
          <div className="p-3 text-sm text-gray-500 italic">
            No jobs available in the database
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="p-3 text-sm text-gray-500 italic">
            No jobs match the filters
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