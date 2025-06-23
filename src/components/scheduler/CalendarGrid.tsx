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
  
  // Log worker data without full objects
  useEffect(() => {
    console.log('CalendarGrid: Workers:', {
      count: workers.length,
      names: workers.map(w => w.name)
    });
  }, [workers]);
  
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
              className={`p-1.5 rounded-full transition-colors ${
                readOnly 
                  ? 'text-gray-400 cursor-not-allowed' 
                  : 'hover:bg-gray-200 text-gray-600'
              }`}
              title={readOnly ? 'Read-only mode' : 'Manage Workers'}
              disabled={readOnly}
            >
              <Minus className="h-5 w-5" />
            </button>
            <button
              onClick={onNewWorker}
              className={`p-1.5 rounded-full transition-colors ${
                readOnly 
                  ? 'text-gray-400 cursor-not-allowed' 
                  : 'hover:bg-gray-200 text-gray-600'
              }`}
              title={readOnly ? 'Read-only mode' : 'Add New Worker'}
              disabled={readOnly}
            >
              <Plus className="h-5 w-5" />
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
              readOnly={readOnly}
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
                readOnly={readOnly}
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
          readOnly={readOnly}
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
  
  // Sort jobs by priority
  const sortedJobs = [...jobs].sort((a, b) => {
    const aHasBothDates = !!(a.start_date && a.end_date);
    const bHasBothDates = !!(b.start_date && b.end_date);
    
    if (aHasBothDates && !bHasBothDates) return -1;
    if (!aHasBothDates && bHasBothDates) return 1;
    
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
  
  const mainJob = sortedJobs[0];
  const hasMoreJobs = sortedJobs.length > 1;
  
  // Fixed cell height
  const cellHeight = 100;
  
  // Determine if this cell should render the job and how it should span
  let shouldRenderJob = false;
  let jobSpan = 1;
  let showText = false;
  let isLastDay = false;
  
  if (mainJob && mainJob.start_date && mainJob.end_date) {
    const startDate = parseISO(mainJob.start_date);
    const endDate = parseISO(mainJob.end_date);
    
    // Only render on the start day (or first day of week if job started before)
    const isStartDay = isSameDay(day, startDate);
    const isFirstDayOfWeek = dayIndex === 0;
    const jobStartsBeforeWeek = isBefore(startDate, days[0]);
    
    shouldRenderJob = isStartDay || (isFirstDayOfWeek && jobStartsBeforeWeek);
    
    if (shouldRenderJob) {
      // Calculate how many days this job should span from this day
      const remainingDaysInWeek = days.length - dayIndex;
      let jobDaysFromThisDay: number;
      
      if (isStartDay) {
        // Job starts on this day
        jobDaysFromThisDay = differenceInDays(endDate, startDate) + 1;
      } else {
        // Job started before this week
        jobDaysFromThisDay = differenceInDays(endDate, day) + 1;
      }
      
      jobSpan = Math.min(jobDaysFromThisDay, remainingDaysInWeek);
      showText = true;
      
      // Check if this is the last day of the job (for resize handle)
      const actualEndDayIndex = days.findIndex(d => isSameDay(d, endDate));
      isLastDay = actualEndDayIndex === dayIndex + jobSpan - 1 || actualEndDayIndex === -1;
    }
  }
  
  return (
    <div
      ref={drop}
      data-date={format(day, 'yyyy-MM-dd')}
      className={`
        w-[calc((100%-12rem)/7)] border-r border-gray-200 relative
        ${isOver && !readOnly ? 'bg-blue-50' : isToday(day) ? 'bg-blue-50/30' : 'bg-white'}
        ${readOnly ? 'cursor-default' : ''}
      `}
      style={{ height: `${cellHeight}px` }}
    >
      <div className="h-full relative p-1">
        {mainJob && shouldRenderJob && (
          <div 
            className="absolute left-0 right-0 top-0 mx-1 mt-1"
            style={{ 
              width: `calc(${jobSpan * 100}% - 0.5rem)`,
              height: "calc(100% - 6px)"
            }}
          >
            <DraggableJob
              job={mainJob}
              onClick={() => onJobClick(mainJob)}
              isScheduled={true}
              onResize={isLastDay ? onJobResize : undefined} // Only allow resize on last day
              isWeekView={true}
              showText={showText}
              dayIndex={dayIndex}
              days={days}
              readOnly={readOnly}
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