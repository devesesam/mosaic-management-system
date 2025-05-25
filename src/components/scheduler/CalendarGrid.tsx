import React, { useState, useEffect } from 'react';
import { useDrop } from 'react-dnd';
import { format, isToday, differenceInDays, isSameDay, addDays, parseISO, isWithinInterval, isBefore, isAfter } from 'date-fns';
import { Job, Worker } from '../../types';
import DraggableJob from './DraggableJob';
import { Plus, Minus } from 'lucide-react';
import WorkerManageModal from './WorkerManageModal';
import DayJobsModal from './DayJobsModal';
import { useAuth } from '../../context/AuthContext';

interface CalendarGridProps {
  days: Date[];
  workers: Worker[];
  getWorkerDayJobs: (workerId: string | null, day: Date) => Job[];
  onJobDrop: (job: Job, workerId: string | null, date: Date) => void;
  onJobClick: (job: Job) => void;
  onJobResize: (job: Job, days: number) => void;
  onNewWorker: () => void;
  readOnly?: boolean;
}

const CalendarGrid: React.FC<CalendarGridProps> = ({
  days,
  workers,
  getWorkerDayJobs,
  onJobDrop,
  onJobClick,
  onJobResize,
  onNewWorker,
  readOnly = false
}) => {
  const [isManageWorkersOpen, setIsManageWorkersOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<{ date: Date; workerId: string | null } | null>(null);
  const [selectedWorker, setSelectedWorker] = useState<string | 'all'>('all');
  const { isAdmin } = useAuth();
  
  const canEdit = isAdmin && !readOnly;
  
  // Display jobs for debugging - this will make jobs visible regardless of filtering
  const allJobs: Record<string, number> = {};
  
  if (workers.length > 0 && days.length > 0) {
    workers.forEach(worker => {
      days.forEach(day => {
        const jobsForCell = getWorkerDayJobs(worker.id, day);
        const key = `${worker.id}-${format(day, 'yyyy-MM-dd')}`;
        allJobs[key] = jobsForCell.length;
      });
    });
    
    // Also check unassigned jobs
    days.forEach(day => {
      const unassignedJobs = getWorkerDayJobs(null, day);
      const key = `unassigned-${format(day, 'yyyy-MM-dd')}`;
      allJobs[key] = unassignedJobs.length;
    });
  }
  
  const totalJobsDisplayed = Object.values(allJobs).reduce((sum, count) => sum + count, 0);
  
  const displayedWorkers = selectedWorker === 'all' 
    ? workers 
    : workers.filter(w => w.id === selectedWorker);

  return (
    <div className="min-w-fit">
      {/* Header row with days */}
      <div className="flex sticky top-0 z-20 bg-white">
        {/* Worker column header */}
        <div className="w-48 flex-shrink-0 h-14 border-r border-b border-gray-200 bg-gray-100 flex items-center justify-between px-3">
          <div className="flex items-center space-x-2 flex-1">
            <select
              value={selectedWorker}
              onChange={(e) => setSelectedWorker(e.target.value)}
              className="text-sm border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 max-w-[120px]"
            >
              <option value="all">All Workers</option>
              {workers.map((worker) => (
                <option key={worker.id} value={worker.id}>
                  {worker.name}
                </option>
              ))}
            </select>
          </div>
          {canEdit && (
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setIsManageWorkersOpen(true)}
                className="p-1.5 rounded-full hover:bg-gray-200 transition-colors"
                title="Manage Workers"
              >
                <Minus className="h-5 w-5 text-gray-600" />
              </button>
              <button
                onClick={onNewWorker}
                className="p-1.5 rounded-full hover:bg-gray-200 transition-colors"
                title="Add New Worker"
              >
                <Plus className="h-5 w-5 text-gray-600" />
              </button>
            </div>
          )}
        </div>
        
        {/* Day headers */}
        {days.map(day => (
          <div
            key={day.toString()}
            className={`w-[calc((100%-12rem)/7)] h-14 flex flex-col justify-center border-r border-b border-gray-200 ${
              isToday(day) ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-800'
            }`}
          >
            <div className="text-sm text-center">{format(day, 'EEEE')}</div>
            <div className="text-lg text-center font-medium">{format(day, 'd')}</div>
          </div>
        ))}
      </div>

      {/* Debug info - always show this to help debugging */}
      <div className="p-2 bg-gray-50 border-b border-gray-200 text-sm">
        <div className="flex justify-between items-center">
          <div>
            <span className="font-medium">Workers:</span> {workers.length} | 
            <span className="font-medium ml-2">Jobs displayed:</span> {totalJobsDisplayed}
          </div>
          <button
            onClick={() => window.location.reload()}
            className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
          >
            Refresh Data
          </button>
        </div>
      </div>

      {/* No workers message */}
      {workers.length === 0 && (
        <div className="p-4 text-amber-600 bg-amber-50 border-b border-amber-100 font-medium text-center">
          No workers found in the database. Add a worker to start scheduling jobs.
        </div>
      )}

      {/* Grid content */}
      <div className="flex flex-col">
        {/* Unassigned row */}
        <div className="flex border-b border-gray-200">
          <div className="w-48 flex-shrink-0 p-3 border-r border-gray-200 bg-gray-50 font-medium text-gray-700">
            Unassigned
          </div>
          {days.map(day => (
            <CalendarCell
              key={`unassigned-${day.toString()}`}
              workerId={null}
              day={day}
              days={days}
              jobs={getWorkerDayJobs(null, day)}
              onJobDrop={onJobDrop}
              onJobClick={onJobClick}
              onJobResize={onJobResize}
              onShowMore={(date) => setSelectedDay({ date, workerId: null })}
              readOnly={readOnly}
            />
          ))}
        </div>

        {/* Worker rows */}
        {displayedWorkers.map(worker => (
          <div key={worker.id} className="flex border-b border-gray-200">
            <div className="w-48 flex-shrink-0 p-3 border-r border-gray-200 bg-gray-50 font-medium text-gray-700">
              {worker.name}
              {worker.role === 'viewer' && (
                <span className="ml-2 text-xs text-amber-600 font-normal">(View Only)</span>
              )}
            </div>
            {days.map(day => (
              <CalendarCell
                key={`${worker.id}-${day.toString()}`}
                workerId={worker.id}
                day={day}
                days={days}
                jobs={getWorkerDayJobs(worker.id, day)}
                onJobDrop={onJobDrop}
                onJobClick={onJobClick}
                onJobResize={onJobResize}
                onShowMore={(date) => setSelectedDay({ date, workerId: worker.id })}
                readOnly={readOnly}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Worker Management Modal */}
      {isManageWorkersOpen && canEdit && (
        <WorkerManageModal
          onClose={() => setIsManageWorkersOpen(false)}
          workers={workers}
        />
      )}

      {/* Day Jobs Modal */}
      {selectedDay && (
        <DayJobsModal
          date={selectedDay.date}
          jobs={getWorkerDayJobs(selectedDay.workerId, selectedDay.date)}
          onClose={() => setSelectedDay(null)}
          onJobClick={(job) => {
            onJobClick(job);
            setSelectedDay(null);
          }}
        />
      )}
    </div>
  );
};

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
  
  // Find the most important job for this cell - simplify sorting to just take the first job
  const mainJob = jobs.length > 0 ? jobs[0] : null;
  const hasMoreJobs = jobs.length > 1;
  
  // Always show job count for debugging
  const jobCount = jobs.length;
  
  // Fixed cell height
  const cellHeight = 100;
  
  return (
    <div
      ref={drop}
      data-date={format(day, 'yyyy-MM-dd')}
      className={`
        w-[calc((100%-12rem)/7)] border-r border-gray-200 relative
        ${isOver ? 'bg-blue-50' : isToday(day) ? 'bg-blue-50/30' : 'bg-white'}
        ${readOnly ? 'cursor-default' : ''}
      `}
      style={{ height: `${cellHeight}px` }}
    >
      <div className="h-full relative p-1">
        {/* Always show job count in corner for debugging */}
        {jobCount > 0 && (
          <div className="absolute top-0 right-0 bg-gray-100 text-gray-600 text-xs px-1 rounded-bl">
            {jobCount}
          </div>
        )}
        
        {/* Main job display */}
        {mainJob && (
          <div 
            className="absolute left-0 right-0 top-0 mx-1 mt-4"
            style={{ height: "calc(100% - 10px)" }}
          >
            <DraggableJob
              job={mainJob}
              onClick={() => onJobClick(mainJob)}
              isScheduled={true}
              onResize={(days) => onJobResize(mainJob, days)}
              isWeekView={true}
              showText={true}
              readOnly={readOnly}
            />
          </div>
        )}
        
        {hasMoreJobs && (
          <button
            onClick={() => onShowMore(day)}
            className="absolute bottom-1 right-2 text-xs text-gray-500 hover:text-gray-700 hover:underline z-10"
          >
            +{jobs.length - 1} more
          </button>
        )}
        
        {jobs.length === 0 && (
          <div className="h-full w-full flex items-center justify-center">
            <div className="w-full h-full" />
          </div>
        )}
      </div>
    </div>
  );
};

export default CalendarGrid;