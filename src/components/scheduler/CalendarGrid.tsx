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
      {/* Header row with days - Increased z-index to stay above all content */}
      <div className="flex sticky top-0 z-30 bg-white">
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
          <WorkerRow
            workerId={null}
            workerName="Unassigned"
            days={days}
            getWorkerDayJobs={getWorkerDayJobs}
            onJobDrop={onJobDrop}
            onJobClick={onJobClick}
            onJobResize={onJobResize}
            onShowMore={(date) => setSelectedDay({ date, workerId: null })}
            readOnly={readOnly}
          />
        )}

        {/* Worker rows */}
        {displayedWorkers.map(worker => (
          <WorkerRow
            key={worker.id}
            workerId={worker.id}
            workerName={worker.name}
            days={days}
            getWorkerDayJobs={getWorkerDayJobs}
            onJobDrop={onJobDrop}
            onJobClick={onJobClick}
            onJobResize={onJobResize}
            onShowMore={(date) => setSelectedDay({ date, workerId: worker.id })}
            readOnly={readOnly}
          />
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

interface WorkerRowProps {
  workerId: string | null;
  workerName: string;
  days: Date[];
  getWorkerDayJobs: (workerId: string | null, day: Date) => Job[];
  onJobDrop: (job: Job, workerId: string | null, date: Date) => void;
  onJobClick: (job: Job) => void;
  onJobResize: (job: Job, days: number) => void;
  onShowMore: (date: Date) => void;
  readOnly?: boolean;
}

const WorkerRow: React.FC<WorkerRowProps> = ({
  workerId,
  workerName,
  days,
  getWorkerDayJobs,
  onJobDrop,
  onJobClick,
  onJobResize,
  onShowMore,
  readOnly = false
}) => {
  // Get all jobs for this worker across all days
  const allWorkerJobs = React.useMemo(() => {
    const jobsMap = new Map<string, Job>();
    
    // Collect unique jobs across all days
    days.forEach(day => {
      const dayJobs = getWorkerDayJobs(workerId, day);
      dayJobs.forEach(job => {
        jobsMap.set(job.id, job);
      });
    });
    
    return Array.from(jobsMap.values());
  }, [workerId, days, getWorkerDayJobs]);

  // Calculate which jobs should render on which days
  const renderingData = React.useMemo(() => {
    const data: Array<{
      job: Job;
      renderDay: Date;
      dayIndex: number;
      span: number;
      stackIndex: number;
    }> = [];
    
    // First, sort jobs by start date to ensure consistent stacking order
    const sortedJobs = [...allWorkerJobs].sort((a, b) => {
      if (!a.start_date && !b.start_date) return 0;
      if (!a.start_date) return 1;
      if (!b.start_date) return -1;
      return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
    });
    
    // Track which jobs occupy which stack positions for each day
    const dayStacks: { [key: string]: Array<{
      job: Job;
      span: number;
      stackIndex: number;
    }> } = {};
    
    sortedJobs.forEach(job => {
      if (!job.start_date) return;
      
      try {
        const jobStartDate = parseISO(job.start_date);
        const jobEndDate = job.end_date ? parseISO(job.end_date) : jobStartDate;
        
        // Find which day this job should render on
        let renderDay: Date | null = null;
        let renderDayIndex = -1;
        
        // Check if job starts within this week
        const startDayIndex = days.findIndex(day => isSameDay(day, jobStartDate));
        if (startDayIndex >= 0) {
          renderDay = days[startDayIndex];
          renderDayIndex = startDayIndex;
        } else if (jobStartDate < days[0] && jobEndDate >= days[0]) {
          // Job started before this week but extends into it - render on first day
          renderDay = days[0];
          renderDayIndex = 0;
        }
        
        if (renderDay && renderDayIndex >= 0) {
          // Calculate span
          const endDayIndex = days.findIndex(day => isSameDay(day, jobEndDate));
          let span: number;
          
          if (endDayIndex >= 0) {
            // Job ends within this week
            span = endDayIndex - renderDayIndex + 1;
          } else if (jobEndDate > days[days.length - 1]) {
            // Job extends beyond this week
            span = days.length - renderDayIndex;
          } else {
            // Single day job
            span = 1;
          }
          
          // Find the lowest available stack position that doesn't conflict with existing jobs
          const dayKey = format(renderDay, 'yyyy-MM-dd');
          if (!dayStacks[dayKey]) dayStacks[dayKey] = [];
          
          // Find available stack position by checking for conflicts across the span
          let stackIndex = 0;
          let foundSlot = false;
          
          while (!foundSlot) {
            foundSlot = true;
            
            // Check if this stack position conflicts with any existing job across the span
            for (let dayOffset = 0; dayOffset < span; dayOffset++) {
              const checkDayIndex = renderDayIndex + dayOffset;
              if (checkDayIndex >= days.length) break;
              
              const checkDayKey = format(days[checkDayIndex], 'yyyy-MM-dd');
              if (!dayStacks[checkDayKey]) dayStacks[checkDayKey] = [];
              
              const conflictingJob = dayStacks[checkDayKey].find(existingJob => 
                existingJob.stackIndex === stackIndex
              );
              
              if (conflictingJob) {
                foundSlot = false;
                stackIndex++;
                break;
              }
            }
          }
          
          // Reserve this stack position across all days in the span
          for (let dayOffset = 0; dayOffset < span; dayOffset++) {
            const reserveDayIndex = renderDayIndex + dayOffset;
            if (reserveDayIndex >= days.length) break;
            
            const reserveDayKey = format(days[reserveDayIndex], 'yyyy-MM-dd');
            if (!dayStacks[reserveDayKey]) dayStacks[reserveDayKey] = [];
            
            dayStacks[reserveDayKey].push({
              job,
              span,
              stackIndex
            });
          }
          
          data.push({
            job,
            renderDay,
            dayIndex: renderDayIndex,
            span: Math.max(1, span),
            stackIndex
          });
        }
      } catch (error) {
        console.error('Error processing job dates:', error, job);
      }
    });
    
    return data;
  }, [allWorkerJobs, days]);

  // Calculate row height based on maximum stack depth
  const maxStackDepth = React.useMemo(() => {
    let maxDepth = 0;
    days.forEach(day => {
      const dayJobs = renderingData.filter(data => isSameDay(data.renderDay, day));
      const dayMaxStack = Math.max(...dayJobs.map(data => data.stackIndex), -1) + 1;
      maxDepth = Math.max(maxDepth, dayMaxStack);
    });
    return Math.max(1, maxDepth); // Minimum 1 for one job height
  }, [renderingData]);

  const rowHeight = Math.max(86, maxStackDepth * 78 + 16); // 78px per job (72px height + 6px spacing) + padding

  return (
    <div className="flex border-b border-gray-200" style={{ minHeight: `${rowHeight}px` }}>
      <div className="w-48 flex-shrink-0 p-3 border-r border-gray-200 bg-gray-50 font-medium text-gray-700">
        {workerName}
      </div>
      {days.map((day, dayIndex) => (
        <CalendarCell
          key={`${workerId}-${day.toString()}`}
          workerId={workerId}
          day={day}
          dayIndex={dayIndex}
          days={days}
          renderingData={renderingData.filter(data => data.dayIndex === dayIndex)}
          onJobDrop={onJobDrop}
          onJobClick={onJobClick}
          onJobResize={onJobResize}
          readOnly={readOnly}
          rowHeight={rowHeight}
        />
      ))}
    </div>
  );
};

interface CalendarCellProps {
  workerId: string | null;
  day: Date;
  dayIndex: number;
  days: Date[];
  renderingData: Array<{
    job: Job;
    renderDay: Date;
    dayIndex: number;
    span: number;
    stackIndex: number;
  }>;
  onJobDrop: (job: Job, workerId: string | null, date: Date) => void;
  onJobClick: (job: Job) => void;
  onJobResize: (job: Job, days: number) => void;
  readOnly?: boolean;
  rowHeight: number;
}

const CalendarCell: React.FC<CalendarCellProps> = ({
  workerId,
  day,
  dayIndex,
  days,
  renderingData,
  onJobDrop,
  onJobClick,
  onJobResize,
  readOnly = false,
  rowHeight
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

  return (
    <div
      ref={drop}
      data-date={format(day, 'yyyy-MM-dd')}
      className={`
        w-[calc((100%-12rem)/7)] border-r border-gray-200 relative
        ${isOver && !readOnly ? 'bg-blue-50' : isToday(day) ? 'bg-blue-50/30' : 'bg-white'}
        ${readOnly ? 'cursor-default' : ''}
      `}
      style={{ height: `${rowHeight}px` }}
    >
      <div className="absolute inset-0 p-1">
        {/* Render jobs that should appear on this day */}
        {renderingData.map(({ job, span, stackIndex }) => {
          // Check if this is a secondary assignment
          const isSecondaryAssignment = workerId !== null && 
                         job.worker_id !== workerId &&
                         job.secondary_worker_ids?.includes(workerId);
          
          const cellWidth = 100 / 7; // Each cell is 1/7th of the container
          const spanWidth = cellWidth * span;
          const jobHeight = 72;
          
          return (
            <div
              key={job.id}
              className={`absolute ${isSecondaryAssignment ? 'opacity-80' : ''}`}
              style={{
                left: '4px',
                top: `${4 + stackIndex * (jobHeight + 6)}px`,
                width: span > 1 ? `calc(${spanWidth}% * 7 - 8px)` : 'calc(100% - 8px)',
                height: `${jobHeight}px`,
                zIndex: isSecondaryAssignment ? 5 : 10,
              }}
            >
              <DraggableJob
                job={job}
                onClick={() => onJobClick(job)}
                isScheduled={true}
                onResize={!readOnly && !isSecondaryAssignment && job.end_date ? onJobResize : undefined}
                isWeekView={true}
                showText={true}
                dayIndex={dayIndex}
                days={days}
                readOnly={readOnly || isSecondaryAssignment}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CalendarGrid;