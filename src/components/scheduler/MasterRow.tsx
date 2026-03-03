import React from 'react';
import { format, isToday, isSameDay, parseISO } from 'date-fns';
import { Task, TeamMember } from '../../types';
import DraggableTask from './DraggableTask';
import { Eye } from 'lucide-react';

interface MasterRowProps {
  days: Date[];
  allTasks: Task[];
  teamMembers: TeamMember[];
  onTaskClick: (task: Task) => void;
}

const MasterRow: React.FC<MasterRowProps> = ({
  days,
  allTasks,
  teamMembers,
  onTaskClick,
}) => {
  // Get team member name by ID
  const getTeamMemberName = (workerId: string | null): string => {
    if (!workerId) return 'Unassigned';
    const member = teamMembers.find(m => m.id === workerId);
    return member?.name || 'Unknown';
  };

  // Get all scheduled tasks (tasks with start_date)
  const scheduledTasks = React.useMemo(() => {
    return allTasks.filter(task => task.start_date);
  }, [allTasks]);

  // Calculate which tasks should render on which days
  const renderingData = React.useMemo(() => {
    const data: Array<{
      task: Task;
      renderDay: Date;
      dayIndex: number;
      span: number;
      stackIndex: number;
    }> = [];

    // Sort tasks by start date for consistent stacking
    const sortedTasks = [...scheduledTasks].sort((a, b) => {
      if (!a.start_date && !b.start_date) return 0;
      if (!a.start_date) return 1;
      if (!b.start_date) return -1;
      return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
    });

    // Track stack positions for each day
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
          // Task started before this week but extends into it
          renderDay = days[0];
          renderDayIndex = 0;
        }

        if (renderDay && renderDayIndex >= 0) {
          // Calculate span
          const endDayIndex = days.findIndex(day => isSameDay(day, taskEndDate));
          let span: number;

          if (endDayIndex >= 0) {
            span = endDayIndex - renderDayIndex + 1;
          } else if (taskEndDate > days[days.length - 1]) {
            span = days.length - renderDayIndex;
          } else {
            span = 1;
          }

          // Find available stack position
          const dayKey = format(renderDay, 'yyyy-MM-dd');
          if (!dayStacks[dayKey]) dayStacks[dayKey] = [];

          let stackIndex = 0;
          let foundSlot = false;

          while (!foundSlot) {
            foundSlot = true;

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

          // Reserve stack position across all days in span
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
        console.error('MasterRow: Error processing task dates:', error, task);
      }
    });

    return data;
  }, [scheduledTasks, days]);

  // Calculate row height based on maximum stack depth
  const maxStackDepth = React.useMemo(() => {
    let maxDepth = 0;
    days.forEach(day => {
      const dayTasks = renderingData.filter(data => isSameDay(data.renderDay, day));
      const dayMaxStack = Math.max(...dayTasks.map(data => data.stackIndex), -1) + 1;
      maxDepth = Math.max(maxDepth, dayMaxStack);
    });
    return Math.max(1, maxDepth);
  }, [renderingData, days]);

  const rowHeight = Math.max(86, maxStackDepth * 78 + 16);

  return (
    <div className="flex border-b-2 border-margaux" style={{ minHeight: `${rowHeight}px` }}>
      {/* Master row header - darker background for distinction */}
      <div className="w-24 sm:w-32 md:w-48 flex-shrink-0 p-2 md:p-3 border-r border-gray-200 bg-margaux/20 flex items-center gap-2">
        <Eye className="h-4 w-4 text-blueberry flex-shrink-0" />
        <span className="font-semibold text-blueberry text-xs sm:text-sm md:text-base truncate">
          Master View
        </span>
      </div>

      {/* Day cells - display only, no drop */}
      {days.map((day, dayIndex) => {
        const dayRenderingData = renderingData.filter(data => data.dayIndex === dayIndex);

        return (
          <div
            key={day.toString()}
            className={`
              flex-1 min-w-0 border-r border-gray-200 relative
              ${isToday(day) ? 'bg-margaux/10' : 'bg-margaux/5'}
            `}
            style={{ height: `${rowHeight}px` }}
          >
            <div className="absolute inset-0 p-1">
              {dayRenderingData.map(({ task, span, stackIndex }) => {
                const assignedName = getTeamMemberName(task.worker_id);
                const cellWidth = 100 / 7;
                const spanWidth = cellWidth * span;
                const taskHeight = 72;

                return (
                  <div
                    key={task.id}
                    className="absolute"
                    style={{
                      left: '4px',
                      top: `${4 + stackIndex * (taskHeight + 6)}px`,
                      width: span > 1 ? `calc(${spanWidth}% * 7 - 8px)` : 'calc(100% - 8px)',
                      height: `${taskHeight}px`,
                      zIndex: 10,
                    }}
                  >
                    <div className="relative h-full">
                      <DraggableTask
                        task={task}
                        onClick={() => onTaskClick(task)}
                        isScheduled={true}
                        isWeekView={true}
                        showText={true}
                        dayIndex={dayIndex}
                        days={days}
                        readOnly={true}
                      />
                      {/* Team member badge overlay */}
                      <div
                        className="absolute bottom-0 right-0 px-1.5 py-0.5 text-[10px] font-medium bg-white/90 border border-gray-300 rounded-tl text-gray-700 max-w-[80%] truncate"
                        title={assignedName}
                      >
                        {assignedName}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MasterRow;
