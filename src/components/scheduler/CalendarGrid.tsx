import React, { useState, useEffect } from 'react';
import { useDrop } from 'react-dnd';
import { format, isToday, differenceInDays, isSameDay, addDays, parseISO, isWithinInterval, isBefore, isAfter } from 'date-fns';
import { Job, Worker } from '../../types';
import DraggableJob from './DraggableJob';
import { Plus, Minus } from 'lucide-react';
import WorkerManageModal from './WorkerManageModal';
import DayJobsModal from './DayJobsModal';

interface CalendarGridProps {
  days: Date[];
  workers: Worker[];
  getWorkerDayJobs: (workerId: string | null, day: Date) => Job[];
  onJobDrop: (job: Job, workerId: string | null, date: Date) => void;
  onJobClick: (job: Job) => void;
  onJobResize: (job: Job, days: number) => void;
  onNewWorker: () => void;
}

const CalendarGrid: React.FC<CalendarGridProps> = ({
  days,
  workers,
  getWorkerDayJobs,
  onJobDrop,
  onJobClick,
  onJobResize,
  onNewWorker
}) => {
  const [isManageWorkersOpen, setIsManageWorkersOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<{ date: Date; workerId: string | null } | null>(null);
  const [selectedWorker, setSelectedWorker] = useState<string | 'all'>('all');
  
  // Debug logging for data
  useEffect(() => {
    if (workers.length === 0) {
      console.log('CalendarGrid: No workers available');
    } else {
      console.log(`CalendarGrid: ${workers.length} workers available`);
    }

    // Check if there are any jobs for the first day
    if (days.length > 0 && workers.length > 0) {
      const firstDayJobs = workers.flatMap(worker => 
        getWorkerDayJobs(worker.id, days[0])
      );
      console.log(`CalendarGrid: Found ${firstDayJobs.length} jobs for the first day`);
      
      const unassignedJobs = getWorkerDayJobs(null, days[0]);
      console.log(`CalendarGrid: Found ${unassignedJobs.length} unassigned jobs for the first day`);
    }
  }, [days, workers, getWorkerDayJobs]);
  
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
            />
          ))}
        </div>

        {/* Worker rows */}
        {displayedWorkers.map(worker => (
          <div key={worker.id} className="flex border-b border-gray-200">
            <div className="w-48 flex-shrink-0 p-3 border-r border-gray-200 bg-gray-50 font-medium text-gray-700">
              {worker.name}
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
              />
            ))}
          </div>
        ))}
      </div>

      {/* Worker Management Modal */}
      {isManageWorkersOpen && (
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
}

const CalendarCell: React.FC<CalendarCellProps> = ({
  workerId,
  day,
  days,
  jobs,
  onJobDrop,
  onJobClick,
  onJobResize,
  onShowMore
}) => {
  const [{ isOver }, drop] = useDrop({
    accept: 'JOB',
    drop: (item: { job: Job }) => {
      onJobDrop(item.job, workerId, day);
    },
    collect: monitor => ({
      isOver: !!monitor.isOver()
    })
  });

  // Current day index in the week
  const dayIndex = days.findIndex(d => isSameDay(d, day));
  
  // Find the most important job for this cell
  const sortedJobs = [...jobs]
    .sort((a, b) => {
      // First sort by jobs that have both dates
      const aHasBothDates = !!(a.start_date && a.end_date);
      const bHasBothDates = !!(b.start_date && b.end_date);
      
      if (aHasBothDates && !bHasBothDates) return -1;
      if (!aHasBothDates && bHasBothDates) return 1;
      
      // Then by start date (newest first)
      if (a.start_date && b.start_date) {
        const aDate = new Date(a.start_date);
        const bDate = new Date(b.start_date);
        return bDate.getTime() - aDate.getTime();
      }
      
      // Finally by created date
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  
  const mainJob = sortedJobs.length > 0 ? sortedJobs[0] : null;
  const hasMoreJobs = sortedJobs.length > 1;
  
  // Fixed cell height
  const cellHeight = 100;
  
  let jobSpan = 1;
  let showText = false;
  
  if (mainJob && mainJob.start_date && mainJob.end_date) {
    const startDate = parseISO(mainJob.start_date);
    const endDate = parseISO(mainJob.end_date);
    
    const shouldRender = isSameDay(day, startDate) || 
                        (dayIndex === 0 && isBefore(startDate, day));
    
    showText = isSameDay(day, startDate) || (dayIndex === 0 && isBefore(startDate, day));
    
    if (shouldRender) {
      const remainingDays = days.length - dayIndex;
      const jobDaysRemaining = differenceInDays(endDate, day) + 1;
      jobSpan = Math.min(jobDaysRemaining, remainingDays);
    }
  }
  
  // Debug jobs (only in dev mode)
  useEffect(() => {
    if (jobs.length > 0 && dayIndex === 0) {
      console.log(`CalendarCell: Worker ${workerId || 'unassigned'} has ${jobs.length} jobs for day ${format(day, 'MM-dd')}:`, 
        jobs.map(j => ({ id: j.id, address: j.address, start: j.start_date })));
    }
  }, [jobs, workerId, day, dayIndex]);
  
  return (
    <div
      ref={drop}
      data-date={format(day, 'yyyy-MM-dd')}
      className={`
        w-[calc((100%-12rem)/7)] border-r border-gray-200 relative
        ${isOver ? 'bg-blue-50' : isToday(day) ? 'bg-blue-50/30' : 'bg-white'}
      `}
      style={{ height: `${cellHeight}px` }}
    >
      <div className="h-full relative p-1">
        {mainJob && (
          <div 
            className="absolute left-0 right-0 top-0 mx-1 mt-1"
            style={{ 
              width: `calc(${jobSpan} * 100% - 0.5rem)`,
              height: "calc(100% - 6px)"
            }}
          >
            <DraggableJob
              job={mainJob}
              onClick={() => onJobClick(mainJob)}
              isScheduled={true}
              onResize={(days) => onJobResize(mainJob, days)}
              isWeekView={true}
              showText={showText}
            />
          </div>
        )}
        
        {hasMoreJobs && (
          <button
            onClick={() => onShowMore(day)}
            className="absolute bottom-1 right-2 text-xs text-gray-500 hover:text-gray-700 hover:underline z-10"
          >
            +{sortedJobs.length - 1} more
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