import React, { useState, useEffect } from 'react';
import { useDrop } from 'react-dnd';
import { format, isToday, isSameDay, parseISO } from 'date-fns';
import { Task, TeamMember } from '../../types';
import DraggableTask from './DraggableTask';
import { Plus, Minus } from 'lucide-react';
import TeamManageModal from './TeamManageModal';
import DayTasksModal from './DayTasksModal';
import MasterRow from './MasterRow';
import { useAuth } from '../../context/AuthContext';

interface CalendarGridProps {
  days: Date[];
  teamMembers: TeamMember[];
  allTasks: Task[];
  getWorkerDayTasks: (workerId: string | null, day: Date) => Task[];
  onTaskDrop: (task: Task, workerId: string | null, date: Date) => void;
  onTaskClick: (task: Task) => void;
  onTaskResize: (task: Task, days: number) => void;
  onNewWorker: () => void;
  readOnly?: boolean;
}

const CalendarGrid: React.FC<CalendarGridProps> = ({
  days,
  teamMembers,
  allTasks,
  getWorkerDayTasks,
  onTaskDrop,
  onTaskClick,
  onTaskResize,
  onNewWorker,
  readOnly = false
}) => {
  const [isManageTeamOpen, setIsManageTeamOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<{ date: Date; workerId: string | null } | null>(null);
  const [selectedWorker, setSelectedWorker] = useState<string | 'all'>('all');
  const { currentWorker } = useAuth();

  // Log team member data without full objects
  useEffect(() => {
    console.log('CalendarGrid: Team Members:', {
      count: teamMembers.length,
      names: teamMembers.map(m => m.name)
    });
  }, [teamMembers]);

  // Get current user's team member entry and other members sorted alphabetically
  const { currentUserMember, otherMembers } = React.useMemo(() => {
    const currentUser = currentWorker ? teamMembers.find(m => m.id === currentWorker.id) : null;
    const others = teamMembers
      .filter(m => !currentWorker || m.id !== currentWorker.id)
      .sort((a, b) => a.name.localeCompare(b.name));
    return { currentUserMember: currentUser, otherMembers: others };
  }, [teamMembers, currentWorker]);

  // Filter team members based on dropdown selection
  const displayedTeamMembers = React.useMemo(() => {
    if (selectedWorker === 'all') {
      // Return in order: current user first, then others alphabetically
      return currentUserMember ? [currentUserMember, ...otherMembers] : otherMembers;
    }
    return teamMembers.filter(m => m.id === selectedWorker);
  }, [teamMembers, selectedWorker, currentUserMember, otherMembers]);

  return (
    <div className="min-w-fit">
      {/* Header row with days - Increased z-index to stay above all content */}
      <div className="flex sticky top-0 z-30 bg-white">
        {/* Team Member column header - responsive width */}
        <div className="w-24 sm:w-32 md:w-48 flex-shrink-0 h-14 border-r border-b border-gray-200 bg-garlic flex items-center justify-between px-2 md:px-3">
          <div className="flex items-center space-x-2 flex-1">
            <select
              value={selectedWorker}
              onChange={(e) => setSelectedWorker(e.target.value)}
              className="text-sm border-gray-300 rounded-md shadow-sm focus:border-margaux focus:ring-margaux max-w-[120px]"
            >
              <option value="all">All Team</option>
              {teamMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setIsManageTeamOpen(true)}
              className="p-1.5 rounded-full transition-colors hover:bg-vanilla text-charcoal"
              title="Manage Team"
            >
              <Minus className="h-5 w-5" />
            </button>
            <button
              onClick={onNewWorker}
              className="p-1.5 rounded-full transition-colors hover:bg-vanilla text-charcoal"
              title="Add New Team Member"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Day headers - responsive width calculation */}
        {days.map(day => (
          <div
            key={day.toString()}
            className={`flex-1 min-w-0 h-14 flex flex-col justify-center border-r border-b border-gray-200 ${
              isToday(day) ? 'bg-margaux/20 text-blueberry' : 'bg-garlic text-charcoal'
            }`}
          >
            <div className="text-xs sm:text-sm text-center truncate px-1">{format(day, 'EEE')}</div>
            <div className="text-sm sm:text-lg text-center font-medium">{format(day, 'd')}</div>
          </div>
        ))}
      </div>

      {/* No team member message */}
      {teamMembers.length === 0 && (
        <div className="p-4 text-amber-600 bg-amber-50 border-b border-amber-100 font-medium text-center">
          No team members found in the database. Add a team member to start scheduling tasks.
        </div>
      )}

      {/* Master row - shows all tasks from all team members */}
      <MasterRow
        days={days}
        allTasks={allTasks}
        teamMembers={teamMembers}
        onTaskClick={onTaskClick}
      />

      {/* Grid content */}
      <div className="flex flex-col">
        {/* Current user's row first (if viewing all and user is a team member) */}
        {selectedWorker === 'all' && currentUserMember && (
          <WorkerRow
            key={currentUserMember.id}
            workerId={currentUserMember.id}
            workerName={currentUserMember.name}
            days={days}
            getWorkerDayTasks={getWorkerDayTasks}
            onTaskDrop={onTaskDrop}
            onTaskClick={onTaskClick}
            onTaskResize={onTaskResize}
            onShowMore={(date) => setSelectedDay({ date, workerId: currentUserMember.id })}
            readOnly={readOnly}
          />
        )}

        {/* Unassigned row */}
        <WorkerRow
          workerId={null}
          workerName="Unassigned"
          days={days}
          getWorkerDayTasks={getWorkerDayTasks}
          onTaskDrop={onTaskDrop}
          onTaskClick={onTaskClick}
          onTaskResize={onTaskResize}
          onShowMore={(date) => setSelectedDay({ date, workerId: null })}
          readOnly={readOnly}
        />

        {/* Other team member rows (alphabetical), or selected member if filtered */}
        {(selectedWorker === 'all' ? otherMembers : displayedTeamMembers).map(member => (
          <WorkerRow
            key={member.id}
            workerId={member.id}
            workerName={member.name}
            days={days}
            getWorkerDayTasks={getWorkerDayTasks}
            onTaskDrop={onTaskDrop}
            onTaskClick={onTaskClick}
            onTaskResize={onTaskResize}
            onShowMore={(date) => setSelectedDay({ date, workerId: member.id })}
            readOnly={readOnly}
          />
        ))}
      </div>

      {/* Team Management Modal */}
      {isManageTeamOpen && (
        <TeamManageModal
          onClose={() => setIsManageTeamOpen(false)}
          teamMembers={teamMembers}
          readOnly={readOnly}
        />
      )}

      {/* Day Tasks Modal */}
      {selectedDay && (
        <DayTasksModal
          date={selectedDay.date}
          tasks={getWorkerDayTasks(selectedDay.workerId, selectedDay.date)}
          onClose={() => setSelectedDay(null)}
          onTaskClick={(task) => {
            onTaskClick(task);
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
  getWorkerDayTasks: (workerId: string | null, day: Date) => Task[];
  onTaskDrop: (task: Task, workerId: string | null, date: Date) => void;
  onTaskClick: (task: Task) => void;
  onTaskResize: (task: Task, days: number) => void;
  onShowMore: (date: Date) => void;
  readOnly?: boolean;
}

const WorkerRow = React.memo(function WorkerRow({
  workerId,
  workerName,
  days,
  getWorkerDayTasks,
  onTaskDrop,
  onTaskClick,
  onTaskResize,
  onShowMore,
  readOnly = false
}: WorkerRowProps) {
  // Get all tasks for this worker across all days
  const allWorkerTasks = React.useMemo(() => {
    const tasksMap = new Map<string, Task>();

    // Collect unique tasks across all days
    days.forEach(day => {
      const dayTasks = getWorkerDayTasks(workerId, day);
      dayTasks.forEach(task => {
        tasksMap.set(task.id, task);
      });
    });

    return Array.from(tasksMap.values());
  }, [workerId, days, getWorkerDayTasks]);

  // Calculate which tasks should render on which days
  const renderingData = React.useMemo(() => {
    const data: Array<{
      task: Task;
      renderDay: Date;
      dayIndex: number;
      span: number;
      stackIndex: number;
    }> = [];

    // First, sort tasks by start date to ensure consistent stacking order
    const sortedTasks = [...allWorkerTasks].sort((a, b) => {
      if (!a.start_date && !b.start_date) return 0;
      if (!a.start_date) return 1;
      if (!b.start_date) return -1;
      return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
    });

    // Track which tasks occupy which stack positions for each day
    const dayStacks: { [key: string]: Array<{
      task: Task;
      span: number;
      stackIndex: number;
    }> } = {};

    sortedTasks.forEach(task => {
      if (!task.start_date) return;

      try {
        const taskStartDate = parseISO(task.start_date);
        const taskEndDate = task.end_date ? parseISO(task.end_date) : taskStartDate;

        // Find which day this task should render on
        let renderDay: Date | null = null;
        let renderDayIndex = -1;

        // Check if task starts within this week
        const startDayIndex = days.findIndex(day => isSameDay(day, taskStartDate));
        if (startDayIndex >= 0) {
          renderDay = days[startDayIndex];
          renderDayIndex = startDayIndex;
        } else if (taskStartDate < days[0] && taskEndDate >= days[0]) {
          // Task started before this week but extends into it - render on first day
          renderDay = days[0];
          renderDayIndex = 0;
        }

        if (renderDay && renderDayIndex >= 0) {
          // Calculate span
          const endDayIndex = days.findIndex(day => isSameDay(day, taskEndDate));
          let span: number;

          if (endDayIndex >= 0) {
            // Task ends within this week
            span = endDayIndex - renderDayIndex + 1;
          } else if (taskEndDate > days[days.length - 1]) {
            // Task extends beyond this week
            span = days.length - renderDayIndex;
          } else {
            // Single day task
            span = 1;
          }

          // Find the lowest available stack position that doesn't conflict with existing tasks
          const dayKey = format(renderDay, 'yyyy-MM-dd');
          if (!dayStacks[dayKey]) dayStacks[dayKey] = [];

          // Find available stack position by checking for conflicts across the span
          let stackIndex = 0;
          let foundSlot = false;

          while (!foundSlot) {
            foundSlot = true;

            // Check if this stack position conflicts with any existing task across the span
            for (let dayOffset = 0; dayOffset < span; dayOffset++) {
              const checkDayIndex = renderDayIndex + dayOffset;
              if (checkDayIndex >= days.length) break;

              const checkDayKey = format(days[checkDayIndex], 'yyyy-MM-dd');
              if (!dayStacks[checkDayKey]) dayStacks[checkDayKey] = [];

              const conflictingTask = dayStacks[checkDayKey].find(existingTask =>
                existingTask.stackIndex === stackIndex
              );

              if (conflictingTask) {
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
              task,
              span,
              stackIndex
            });
          }

          data.push({
            task,
            renderDay,
            dayIndex: renderDayIndex,
            span: Math.max(1, span),
            stackIndex
          });
        }
      } catch (error) {
        console.error('Error processing task dates:', error, task);
      }
    });

    return data;
  }, [allWorkerTasks, days]);

  // Calculate row height based on maximum stack depth
  const maxStackDepth = React.useMemo(() => {
    let maxDepth = 0;
    days.forEach(day => {
      const dayTasks = renderingData.filter(data => isSameDay(data.renderDay, day));
      const dayMaxStack = Math.max(...dayTasks.map(data => data.stackIndex), -1) + 1;
      maxDepth = Math.max(maxDepth, dayMaxStack);
    });
    return Math.max(1, maxDepth); // Minimum 1 for one task height
  }, [renderingData, days]);

  const rowHeight = Math.max(86, maxStackDepth * 78 + 16); // 78px per task (72px height + 6px spacing) + padding

  return (
    <div className="flex border-b border-gray-200" style={{ minHeight: `${rowHeight}px` }}>
      <div className="w-24 sm:w-32 md:w-48 flex-shrink-0 p-2 md:p-3 border-r border-gray-200 bg-vanilla font-medium text-charcoal text-xs sm:text-sm md:text-base truncate">
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
          onTaskDrop={onTaskDrop}
          onTaskClick={onTaskClick}
          onTaskResize={onTaskResize}
          readOnly={readOnly}
          rowHeight={rowHeight}
        />
      ))}
    </div>
  );
}, (prevProps: WorkerRowProps, nextProps: WorkerRowProps) => {
  // Custom comparison for WorkerRow - only re-render when necessary
  if (prevProps.workerId !== nextProps.workerId) return false;
  if (prevProps.workerName !== nextProps.workerName) return false;
  if (prevProps.readOnly !== nextProps.readOnly) return false;

  // Compare days by first and last date
  if (prevProps.days.length !== nextProps.days.length) return false;
  if (prevProps.days[0]?.getTime() !== nextProps.days[0]?.getTime()) return false;
  if (prevProps.days[prevProps.days.length - 1]?.getTime() !== nextProps.days[nextProps.days.length - 1]?.getTime()) return false;

  // Check if getWorkerDayTasks function reference changed (it will if tasks changed)
  if (prevProps.getWorkerDayTasks !== nextProps.getWorkerDayTasks) return false;

  return true;
});

interface CalendarCellProps {
  workerId: string | null;
  day: Date;
  dayIndex: number;
  days: Date[];
  renderingData: Array<{
    task: Task;
    renderDay: Date;
    dayIndex: number;
    span: number;
    stackIndex: number;
  }>;
  onTaskDrop: (task: Task, workerId: string | null, date: Date) => void;
  onTaskClick: (task: Task) => void;
  onTaskResize: (task: Task, days: number) => void;
  readOnly?: boolean;
  rowHeight: number;
}

const CalendarCell = React.memo(function CalendarCell({
  workerId,
  day,
  dayIndex,
  days,
  renderingData,
  onTaskDrop,
  onTaskClick,
  onTaskResize,
  readOnly = false,
  rowHeight
}: CalendarCellProps) {
  const [{ isOver }, drop] = useDrop({
    accept: 'TASK',
    drop: (item: { task: Task }) => {
      onTaskDrop(item.task, workerId, day);
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
        flex-1 min-w-0 border-r border-gray-200 relative
        ${isOver && !readOnly ? 'bg-sorbet/30' : isToday(day) ? 'bg-margaux/10' : 'bg-white'}
        ${readOnly ? 'cursor-default' : ''}
      `}
      style={{ height: `${rowHeight}px` }}
    >
      <div className="absolute inset-0 p-1">
        {/* Render tasks that should appear on this day */}
        {renderingData.map(({ task, span, stackIndex }) => {
          // Check if this is a secondary assignment
          const isSecondaryAssignment = workerId !== null &&
                         task.worker_id !== workerId &&
                         task.secondary_worker_ids?.includes(workerId);

          const cellWidth = 100 / 7; // Each cell is 1/7th of the container
          const spanWidth = cellWidth * span;
          const taskHeight = 72;

          return (
            <div
              key={task.id}
              className={`absolute ${isSecondaryAssignment ? 'opacity-80' : ''}`}
              style={{
                left: '4px',
                top: `${4 + stackIndex * (taskHeight + 6)}px`,
                width: span > 1 ? `calc(${spanWidth}% * 7 - 8px)` : 'calc(100% - 8px)',
                height: `${taskHeight}px`,
                zIndex: isSecondaryAssignment ? 5 : 10,
              }}
            >
              <DraggableTask
                task={task}
                onClick={() => onTaskClick(task)}
                isScheduled={true}
                onResize={!readOnly && !isSecondaryAssignment && task.end_date ? onTaskResize : undefined}
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
}, (prevProps: CalendarCellProps, nextProps: CalendarCellProps) => {
  // Custom comparison for CalendarCell
  if (prevProps.workerId !== nextProps.workerId) return false;
  if (prevProps.dayIndex !== nextProps.dayIndex) return false;
  if (prevProps.readOnly !== nextProps.readOnly) return false;
  if (prevProps.rowHeight !== nextProps.rowHeight) return false;
  if (prevProps.day.getTime() !== nextProps.day.getTime()) return false;

  // Compare renderingData - check length and task IDs
  if (prevProps.renderingData.length !== nextProps.renderingData.length) return false;
  for (let i = 0; i < prevProps.renderingData.length; i++) {
    const prev = prevProps.renderingData[i];
    const next = nextProps.renderingData[i];
    if (prev.task.id !== next.task.id) return false;
    if (prev.stackIndex !== next.stackIndex) return false;
    if (prev.span !== next.span) return false;
  }

  return true;
});

// Memoize CalendarGrid with custom comparison
const CalendarGridMemo = React.memo(CalendarGrid, (prevProps, nextProps) => {
  // Compare days array
  if (prevProps.days.length !== nextProps.days.length) return false;
  if (prevProps.days[0]?.getTime() !== nextProps.days[0]?.getTime()) return false;
  if (prevProps.days[prevProps.days.length - 1]?.getTime() !== nextProps.days[nextProps.days.length - 1]?.getTime()) return false;

  // Compare team members by ID list
  if (prevProps.teamMembers.length !== nextProps.teamMembers.length) return false;
  for (let i = 0; i < prevProps.teamMembers.length; i++) {
    if (prevProps.teamMembers[i].id !== nextProps.teamMembers[i].id) return false;
  }

  // Compare tasks - check length and key properties
  if (prevProps.allTasks.length !== nextProps.allTasks.length) return false;
  for (let i = 0; i < prevProps.allTasks.length; i++) {
    const prev = prevProps.allTasks[i];
    const next = nextProps.allTasks[i];
    if (prev.id !== next.id) return false;
    if (prev.start_date !== next.start_date) return false;
    if (prev.end_date !== next.end_date) return false;
    if (prev.worker_id !== next.worker_id) return false;
  }

  // Compare readOnly
  if (prevProps.readOnly !== nextProps.readOnly) return false;

  return true;
});

export default CalendarGridMemo;
