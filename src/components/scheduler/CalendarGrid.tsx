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
  const { user, isEditable } = useAuth();
  const [isManageWorkersOpen, setIsManageWorkersOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<{ date: Date; workerId: string | null } | null>(null);
  const [selectedWorker, setSelectedWorker] = useState<string | 'all'>('all');
  
  // Log worker data without full objects
  useEffect(() => {
    console.log('CalendarGrid: Workers:', {
      count: workers.length,
      names: workers.map(w => w.name),
      readOnly,
      isEditable,
      userEmail: user?.email
    });
  }, [workers, readOnly, isEditable, user?.email]);
  
  // Filter workers based on edit permissions and current user email
  const displayedWorkers = React.useMemo(() => {
    // If user has edit permissions (admin), show all workers or filtered workers
    if (isEditable) {
      if (selectedWorker === 'all') {
        return workers;
      }
      return workers.filter(w => w.id === selectedWorker);
    }
    
    // If user is in read-only mode, only show the worker with matching email
    if (user?.email) {
      const userEmail = user.email.toLowerCase();
      const matchingWorker = workers.find(w => 
        w.email && w.email.toLowerCase() === userEmail
      );
      return matchingWorker ? [matchingWorker] : [];
    }
    
    // No user email or no matching worker - show nothing
    return [];
  }, [workers, selectedWorker, isEditable, user?.email]);

  // Should show unassigned row? Only for users with edit permissions
  const showUnassignedRow = isEditable;

  console.log('CalendarGrid: Display logic:', {
    isEditable,
    userEmail: user?.email,
    totalWorkers: workers.length,
    displayedWorkers: displayedWorkers.length,
    showUnassignedRow,
    displayedWorkerNames: displayedWorkers.map(w => w.name),
    displayedWorkerEmails: displayedWorkers.map(w => w.email)
  });

  return (
    <div className="min-w-fit">
      {/* Header row with days */}
      <div className="flex sticky top-0 z-20 bg-white">
        {/* Worker column header */}
        <div className="w-48 flex-shrink-0 h-14 border-r border-b border-gray-200 bg-gray-100 flex items-center justify-between px-3">
          <div className="flex items-center space-x-2 flex-1">
            {isEditable ? (
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
            ) : (
              <span className="text-sm font-medium text-gray-700">
                {displayedWorkers.length > 0 ? displayedWorkers[0].name : 'Workers'}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setIsManageWorkersOpen(true)}
              className={`p-1.5 rounded-full transition-colors ${
                !isEditable 
                  ? 'text-gray-400 cursor-not-allowed' 
                  : 'hover:bg-gray-200 text-gray-600'
              }`}
              title={!isEditable ? 'Read-only mode' : 'Manage Workers'}
              disabled={!isEditable}
            >
              <Minus className="h-5 w-5" />
            </button>
            <button
              onClick={onNewWorker}
              className={`p-1.5 rounded-full transition-colors ${
                !isEditable 
                  ? 'text-gray-400 cursor-not-allowed' 
                  : 'hover:bg-gray-200 text-gray-600'
              }`}
              title={!isEditable ? 'Read-only mode' : 'Add New Worker'}
              disabled={!isEditable}
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

      {/* No workers message for read-only users */}
      {!isEditable && displayedWorkers.length === 0 && (
        <div className="p-4 text-amber-600 bg-amber-50 border-b border-amber-100 font-medium text-center">
          No worker profile found for your email address. Please contact your administrator.
        </div>
      )}

      {/* No workers message for admin users */}
      {isEditable && workers.length === 0 && (
        <div className="p-4 text-amber-600 bg-amber-50 border-b border-amber-100 font-medium text-center">
          No workers found in the database. Add a worker to start scheduling jobs.
        </div>
      )}

      {/* Grid content */}
      <div className="flex flex-col">
        {/* Unassigned row - only show for users with edit permissions */}
        {showUnassignedRow && (
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
                currentRowWorkerId={null}
              />
            ))}
          </div>
        )}

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
                currentRowWorkerId={worker.id}
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
  currentRowWorkerId: string | null;
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
  readOnly = false,
  currentRowWorkerId
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
  
  // Sort jobs by priority: put editable jobs first, then secondary assignments
  const sortedJobs = [...jobs].sort((a, b) => {
    // Check if jobs are secondary assignments for current worker
    const aIsSecondary = currentRowWorkerId !== null && 
                         a.worker_id !== currentRowWorkerId &&
                         a.secondary_worker_ids?.includes(currentRowWorkerId);
    const bIsSecondary = currentRowWorkerId !== null && 
                         b.worker_id !== currentRowWorkerId &&
                         b.secondary_worker_ids?.includes(currentRowWorkerId);
    
    // Primary jobs come before secondary jobs
    if (!aIsSecondary && bIsSecondary) return -1;
    if (aIsSecondary && !bIsSecondary) return 1;
    
    // Within same category, prioritize jobs with both dates
    const aHasBothDates = !!(a.start_date && a.end_date);
    const bHasBothDates = !!(b.start_date && b.end_date);
    
    if (aHasBothDates && !bHasBothDates) return -1;
    if (!aHasBothDates && bHasBothDates) return 1;
    
    // Finally sort by creation date
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
  
  const mainJob = sortedJobs[0];
  const hasMoreJobs = sortedJobs.length > 1;
  
  // Fixed cell height
  const cellHeight = 100;
  
  // NEW LOGIC: Always render the main job if it exists and has dates
  // Calculate the appropriate span from the current day
  let jobSpan = 1;
  let showText = false;
  let isLastDay = false;
  let isSecondaryAssignment = false;
  let effectiveStartDate = day; // The date from which we start rendering this job segment
  
  if (mainJob && mainJob.start_date && mainJob.end_date) {
    const jobStartDate = parseISO(mainJob.start_date);
    const jobEndDate = parseISO(mainJob.end_date);
    
    // Check if this is a secondary assignment
    isSecondaryAssignment = currentRowWorkerId !== null && 
                           mainJob.worker_id !== currentRowWorkerId &&
                           mainJob.secondary_worker_ids?.includes(currentRowWorkerId);
    
    // Calculate the effective start date for this segment
    // This is either the job's actual start date or the current day (whichever is later)
    effectiveStartDate = jobStartDate > day ? jobStartDate : day;
    
    // Calculate how many days this job should span from the effective start date
    const remainingDaysInWeek = days.length - dayIndex;
    const daysFromEffectiveStart = differenceInDays(jobEndDate, effectiveStartDate) + 1;
    
    // Ensure we don't span beyond the current week
    jobSpan = Math.min(Math.max(1, daysFromEffectiveStart), remainingDaysInWeek);
    showText = true;
    
    // Check if this is the last day of the job within this week
    const jobEndDayIndex = days.findIndex(d => isSameDay(d, jobEndDate));
    isLastDay = jobEndDayIndex === dayIndex + jobSpan - 1 || 
                (jobEndDayIndex === -1 && dayIndex + jobSpan - 1 === days.length - 1);
    
    console.log(`CalendarCell: Job ${mainJob.id} on ${format(day, 'yyyy-MM-dd')}:`, {
      jobStart: format(jobStartDate, 'yyyy-MM-dd'),
      jobEnd: format(jobEndDate, 'yyyy-MM-dd'),
      effectiveStart: format(effectiveStartDate, 'yyyy-MM-dd'),
      dayIndex,
      jobSpan,
      isSecondary: isSecondaryAssignment,
      isLastDay
    });
  }
  
  // Determine z-index: secondary assignments should be behind primary assignments
  const zIndex = isSecondaryAssignment ? 5 : 10;
  
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
        {mainJob && mainJob.start_date && mainJob.end_date && (
          <div 
            className={`absolute left-0 right-0 top-0 mx-1 mt-1 ${isSecondaryAssignment ? 'opacity-80' : ''}`}
            style={{ 
              width: `calc(${jobSpan * 100}% - 0.5rem)`,
              height: "calc(100% - 6px)",
              zIndex: zIndex
            }}
          >
            <DraggableJob
              job={mainJob}
              onClick={() => onJobClick(mainJob)}
              isScheduled={true}
              // Only allow resize on last day AND if it's not a secondary assignment
              onResize={isLastDay && !isSecondaryAssignment ? onJobResize : undefined}
              isWeekView={true}
              showText={showText}
              dayIndex={dayIndex}
              days={days}
              // Make read-only if global read-only OR if it's a secondary assignment
              readOnly={readOnly || isSecondaryAssignment}
            />
          </div>
        )}
        
        {hasMoreJobs && (
          <button
            onClick={() => onShowMore(day)}
            className="absolute bottom-1 right-2 text-xs text-gray-500 hover:text-gray-700 hover:underline z-20"
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