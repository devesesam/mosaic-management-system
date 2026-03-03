import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  startOfWeek,
  endOfWeek,
  parseISO,
  isSameDay,
  addDays,
  addMonths,
  subMonths,
  differenceInDays,
  isWithinInterval
} from 'date-fns';
import { useDrop } from 'react-dnd';
import { Task, Worker } from '../../types';
import UnscheduledPanel from './UnscheduledPanel';
import GlobalTaskSearch from './GlobalTaskSearch';
import { useTasksStore } from '../../store/tasksStore';
import { useAuth } from '../../context/AuthContext';
import { TaskForm } from '../tasks';
import DayTasksModal from './DayTasksModal';
import DraggableTask from './DraggableTask';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface MonthViewProps {
  readOnly?: boolean;
}

const MonthView: React.FC<MonthViewProps> = ({ readOnly = false }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isTasksPaneCollapsed, setIsTasksPaneCollapsed] = useState(() => {
    return localStorage.getItem('tasksPaneCollapsed') === 'true';
  });

  // Toggle tasks pane and persist to localStorage
  const toggleTasksPane = () => {
    const newValue = !isTasksPaneCollapsed;
    setIsTasksPaneCollapsed(newValue);
    localStorage.setItem('tasksPaneCollapsed', String(newValue));
  };

  // Use store for data access
  const {
    tasks,
    loading: tasksLoading,
    error: tasksError,
    fetchTasks,
    addTask,
    updateTask,
    deleteTask
  } = useTasksStore();

  const { user, currentWorker } = useAuth();

  // Debug log the tasks data
  useEffect(() => {
    if (tasks.length > 0) {
      console.log('MonthView: Tasks loaded:', tasks.length);
    }
  }, [tasks]);

  // Get start and end of week
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);

  // Navigation handlers
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  // Get the start of the week for the first day of the month
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  // Get the end of the week for the last day of the month
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  // Get all days in the calendar (including days from prev/next months)
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Create weeks array
  const weeks = useMemo(() => {
    const result: Date[][] = [];
    let currentWeek: Date[] = [];

    calendarDays.forEach((day) => {
      currentWeek.push(day);

      if (currentWeek.length === 7) {
        result.push(currentWeek);
        currentWeek = [];
      }
    });

    return result;
  }, [calendarDays]);

  // Show toast notifications for loading states
  useEffect(() => {
    if (tasksLoading) {
      toast.loading('Updating tasks...', { id: 'tasks-loading' });
    } else {
      toast.dismiss('tasks-loading');
    }
  }, [tasksLoading]);

  // Get unscheduled tasks - filter for read-only mode
  const unscheduledTasks = useMemo(() => {
    const baseUnscheduled = tasks.filter(task => !task.start_date || !task.worker_id);

    if (readOnly && currentWorker) {
      // In read-only mode, show tasks that are either:
      // 1. Completely unassigned (no worker, no date)
      // 2. Assigned to current worker (primary or secondary) but no date
      return tasks.filter(task =>
        (!task.start_date && !task.worker_id && (!task.secondary_worker_ids || task.secondary_worker_ids.length === 0)) ||
        (!task.start_date && (
          task.worker_id === currentWorker.id ||
          (task.secondary_worker_ids && task.secondary_worker_ids.includes(currentWorker.id))
        ))
      );
    }

    return baseUnscheduled;
  }, [tasks, readOnly, currentWorker]);

  // Get tasks for a specific day - filter for read-only mode and include secondary workers
  const getDayTasks = useCallback((day: Date) => {
    const allDayTasks = tasks.filter(task => {
      // If task has no start date, it can't be displayed on a specific day
      if (!task.start_date) return false;

      try {
        const jobStart = parseISO(task.start_date);

        // If task has an end date, check if the day falls within the range
        if (task.end_date) {
          const jobEnd = parseISO(task.end_date);

          // Check if this day is within the task's date range
          return isWithinInterval(day, { start: jobStart, end: jobEnd }) ||
            isSameDay(jobStart, day) ||
            isSameDay(jobEnd, day);
        }

        // If no end date, just check if the day matches the start date
        return isSameDay(jobStart, day);
      } catch (error) {
        console.error('Error parsing task dates:', error, task);
        return false;
      }
    });

    // Filter for read-only mode: only show tasks where current worker is primary or secondary
    if (readOnly && currentWorker) {
      return allDayTasks.filter(task =>
        task.worker_id === currentWorker.id ||
        (task.secondary_worker_ids && task.secondary_worker_ids.includes(currentWorker.id))
      );
    }

    return allDayTasks;
  }, [tasks, readOnly, currentWorker]);

  // Get tasks that should be displayed on their start date only
  const getStartDateTasks = useCallback((day: Date) => {
    const startDateTasks = tasks.filter(task => {
      // If task has no start date, it can't be displayed
      if (!task.start_date) return false;

      try {
        const jobStart = parseISO(task.start_date);

        // Only show tasks on their actual start date
        return isSameDay(jobStart, day);
      } catch (error) {
        console.error('Error parsing task dates:', error, task);
        return false;
      }
    });

    // Filter for read-only mode: only show tasks where current worker is primary or secondary
    if (readOnly && currentWorker) {
      return startDateTasks.filter(task =>
        task.worker_id === currentWorker.id ||
        (task.secondary_worker_ids && task.secondary_worker_ids.includes(currentWorker.id))
      );
    }

    return startDateTasks;
  }, [tasks, readOnly, currentWorker]);

  const handleTaskDrop = async (task: Task, date: Date) => {
    if (readOnly) {
      toast.error('Cannot move tasks in read-only mode');
      return;
    }

    try {
      console.log('MonthView: Handling task drop:', { task_id: task.id, date });

      let updates: Partial<Task> = {
        start_date: date.toISOString()
      };

      // Calculate end date to preserve the task's duration
      if (task.start_date && task.end_date) {
        try {
          const originalStartDate = parseISO(task.start_date);
          const originalEndDate = parseISO(task.end_date);

          // Calculate the duration in days (inclusive)
          // For calendar purposes, if start and end are the same day, it's 1 day
          // If end is 1 day after start, it's 2 days, etc.
          let durationInDays: number;

          if (isSameDay(originalStartDate, originalEndDate)) {
            // Single day task
            durationInDays = 1;
          } else {
            // Multi-day task - calculate the span
            durationInDays = differenceInDays(originalEndDate, originalStartDate) + 1;
          }

          // Set the new end date to preserve the duration
          const newEndDate = addDays(date, durationInDays - 1);
          updates.end_date = newEndDate.toISOString();

          console.log('MonthView: Preserving task duration:', {
            task_id: task.id,
            original_start: task.start_date,
            original_end: task.end_date,
            original_duration_days: durationInDays,
            new_start: date.toISOString(),
            new_end: newEndDate.toISOString()
          });
        } catch (error) {
          console.error('Error calculating task duration:', error, task);
          // If we can't calculate duration, make it a single-day task
          updates.end_date = date.toISOString();
        }
      } else {
        // If it's a new task or didn't have dates before, make it a single-day task
        updates.end_date = date.toISOString();
      }

      console.log('MonthView: Updating task with:', updates);
      await updateTask(task.id, updates);
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to move task. Please try again.');
    }
  };

  const handleSubmitTask = async (jobData: Omit<Task, 'id' | 'created_at'>) => {
    if (readOnly) {
      toast.error('Cannot modify tasks in read-only mode');
      return;
    }

    try {
      if (selectedTask) {
        await updateTask(selectedTask.id, jobData);
      } else {
        await addTask(jobData);
      }
      setIsTaskFormOpen(false);
      setSelectedTask(null);
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (readOnly) {
      toast.error('Cannot delete tasks in read-only mode');
      return;
    }

    try {
      await deleteTask(id);
      setIsTaskFormOpen(false);
      setSelectedTask(null);
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  // Handle task resize
  const handleTaskResize = async (task: Task, days: number) => {
    if (readOnly) {
      toast.error('Cannot resize tasks in read-only mode');
      return;
    }

    try {
      console.log('MonthView: Handling task resize:', { task_id: task.id, days });

      if (!task.start_date) {
        console.error('Cannot resize task without start_date');
        return;
      }

      const startDate = parseISO(task.start_date);
      const newEndDate = addDays(startDate, days - 1); // -1 because the start day counts as day 1

      await updateTask(task.id, {
        end_date: newEndDate.toISOString()
      });
    } catch (error) {
      console.error('Error resizing task:', error);
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Main content area with flex layout */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Month navigation header */}
        <div className="flex items-center justify-between p-2 bg-white border-b border-gray-200">
          {/* Left: Navigation */}
          <div className="flex items-center space-x-2 flex-shrink-0">
            <button
              onClick={prevMonth}
              className="p-1 rounded-full hover:bg-gray-100 transition-colors"
              title="Previous month"
            >
              <ChevronLeft className="h-5 w-5 text-gray-600" />
            </button>
            <h2 className="text-xl font-semibold text-gray-800 whitespace-nowrap">
              {format(currentDate, 'MMMM yyyy')}
            </h2>
            <button
              onClick={nextMonth}
              className="p-1 rounded-full hover:bg-gray-100 transition-colors"
              title="Next month"
            >
              <ChevronRight className="h-5 w-5 text-gray-600" />
            </button>
          </div>

          {/* Center: Search bar */}
          <div className="flex-1 flex justify-center px-4">
            <GlobalTaskSearch
              tasks={tasks}
              onTaskSelect={(task) => {
                setSelectedTask(task);
                setIsTaskFormOpen(true);
              }}
            />
          </div>

          {/* Right: Today button */}
          <div className="flex-shrink-0">
            <button
              onClick={goToToday}
              className="text-sm text-margaux hover:text-blueberry font-medium whitespace-nowrap"
            >
              Today
            </button>
          </div>
        </div>

        {/* Error messages - keep these but make them less prominent */}
        {tasksError && (
          <div className="px-4 py-2 bg-red-50 border-b border-red-100 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-red-700">Error loading tasks: {tasksError}</span>
              <button
                onClick={() => {
                  setIsRetrying(true);
                  fetchTasks();
                  setTimeout(() => setIsRetrying(false), 1000);
                }}
                className="ml-2 px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200 flex items-center"
                disabled={isRetrying}
              >
                {isRetrying ? (
                  <>
                    <div className="w-3 h-3 mr-1 border-t-2 border-b-2 border-red-700 rounded-full animate-spin"></div>
                    Retrying...
                  </>
                ) : (
                  'Retry'
                )}
              </button>
            </div>
          </div>
        )}

        {/* Info messages - keep these as they're informational */}
        {!tasksLoading && !tasksError && tasks.length === 0 && (
          <div className="px-4 py-2 bg-yellow-50 border-b border-yellow-100 text-sm">
            <span className="text-yellow-700">No tasks found. Add tasks to start scheduling.</span>
          </div>
        )}

        {/* Main calendar and sidebar layout */}
        <div className="flex flex-1 overflow-hidden">
          {/* Calendar area - takes remaining space */}
          <div className="flex-1 flex flex-col min-w-0 bg-white">
            {/* Weekday headers - fixed position */}
            <div className="grid grid-cols-7 gap-px bg-gray-200 flex-shrink-0 sticky top-0 z-10">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                <div key={day} className="text-center text-xs font-medium text-charcoal py-2 bg-garlic">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid with guaranteed vertical scroll */}
            <div
              className="flex-1 bg-gray-200 overflow-y-scroll overflow-x-hidden"
              style={{
                maxHeight: 'calc(100vh - 200px)', // Force a max height to ensure scrollbar
                scrollbarWidth: 'thin', // For Firefox
                scrollbarColor: '#cbd5e1 #f1f5f9' // For Firefox
              }}
            >
              <div className="grid grid-cols-7 gap-px">
                {weeks.map((week, weekIndex) =>
                  week.map((day, dayIndex) => (
                    <CalendarDay
                      key={`${weekIndex}-${dayIndex}`}
                      day={day}
                      currentDate={currentDate}
                      tasks={getDayTasks(day)}
                      startDateTasks={getStartDateTasks(day)}
                      onTaskDrop={handleTaskDrop}
                      onTaskClick={(task) => {
                        setSelectedTask(task);
                        setIsTaskFormOpen(true);
                      }}
                      onShowMore={() => setSelectedDay(day)}
                      isInCurrentMonth={isSameMonth(day, currentDate)}
                      onTaskResize={handleTaskResize}
                      readOnly={readOnly}
                      currentWorker={currentWorker}
                    />
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Fixed-width unscheduled tasks panel as right sidebar - only show for edit mode */}
          {!readOnly && (
            <UnscheduledPanel
              tasks={unscheduledTasks}
              onTaskDrop={(task) => handleTaskDrop(task, new Date())}
              onTaskClick={(task) => {
                setSelectedTask(task);
                setIsTaskFormOpen(true);
              }}
              readOnly={readOnly}
              isCollapsed={isTasksPaneCollapsed}
              onToggleCollapse={toggleTasksPane}
            />
          )}
        </div>
      </div>

      {/* Task form modal */}
      {isTaskFormOpen && (
        <TaskForm
          onClose={() => {
            setIsTaskFormOpen(false);
            setSelectedTask(null);
          }}
          onSubmit={handleSubmitTask}
          onDelete={handleDeleteTask}
          initialTask={selectedTask || undefined}
          readOnly={readOnly}
        />
      )}

      {/* Day tasks modal */}
      {selectedDay && (
        <DayTasksModal
          date={selectedDay}
          tasks={getDayTasks(selectedDay)}
          onClose={() => setSelectedDay(null)}
          onTaskClick={(task) => {
            setSelectedTask(task);
            setIsTaskFormOpen(true);
          }}
        />
      )}
    </div>
  );
};

interface CalendarDayProps {
  day: Date;
  currentDate: Date;
  tasks: Task[];
  startDateTasks: Task[];
  onTaskDrop: (task: Task, date: Date) => void;
  onTaskClick: (task: Task) => void;
  onShowMore: () => void;
  isInCurrentMonth: boolean;
  onTaskResize: (task: Task, days: number) => void;
  readOnly?: boolean;
  currentWorker?: Worker | null;
}

const CalendarDay: React.FC<CalendarDayProps> = ({
  day,
  currentDate,
  tasks,
  startDateTasks,
  onTaskDrop,
  onTaskClick,
  onShowMore,
  isInCurrentMonth,
  onTaskResize,
  readOnly = false,
  currentWorker
}) => {
  const [{ isOver }, drop] = useDrop({
    accept: 'TASK',
    drop: (item: { task: Task }) => {
      onTaskDrop(item.task, day);
    },
    collect: monitor => ({
      isOver: !!monitor.isOver()
    }),
    canDrop: () => !readOnly
  });

  // Sort start date tasks: put primary assignments first, then secondary
  const sortedStartDateTasks = [...startDateTasks].sort((a, b) => {
    if (currentWorker) {
      const aIsPrimary = a.worker_id === currentWorker.id;
      const bIsPrimary = b.worker_id === currentWorker.id;

      if (aIsPrimary && !bIsPrimary) return -1;
      if (!aIsPrimary && bIsPrimary) return 1;
    }

    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  // Simplified logic: Show "See All Tasks" if there are any tasks on this day
  const hasTasks = tasks.length > 0;

  // Helper function to determine if a task is a secondary assignment for current worker
  const isSecondaryAssignment = (task: Task) => {
    return readOnly && currentWorker &&
      task.worker_id !== currentWorker.id &&
      task.secondary_worker_ids?.includes(currentWorker.id);
  };

  return (
    <div
      ref={drop}
      className={`
        flex flex-col relative border-b border-r border-gray-200
        ${!isInCurrentMonth ? 'bg-vanilla text-gray-400' : 'bg-white'}
        ${isToday(day) ? 'bg-margaux/10' : ''}
        ${isOver && !readOnly ? 'bg-sorbet/30' : ''}
        ${readOnly ? 'cursor-default' : ''}
      `}
    >
      <div className="text-right px-2 py-1 text-sm font-medium border-b border-gray-100 flex-shrink-0">
        {format(day, 'd')}
      </div>

      {/* Container for task tiles - only show tasks that start on this day */}
      <div
        className="flex-1 p-1 flex flex-col"
      >
        {/* Single-day and multi-day tasks starting on this date - show first 3 */}
        {sortedStartDateTasks.map((task, index) => {
          const isSecondary = isSecondaryAssignment(task);
          const zIndex = isSecondary ? 5 : 10;

          return (
            <div
              key={`task-${task.id}`}
              className={`mb-1 ${isSecondary ? 'opacity-80' : ''}`}
              style={{ zIndex: zIndex }}
            >
              <DraggableTask
                task={task}
                onClick={() => onTaskClick(task)}
                isScheduled={true}
                isWeekView={false}
                // Only allow resize if not read-only AND not a secondary assignment
                onResize={!readOnly && !isSecondary ? onTaskResize : undefined}
                readOnly={readOnly || Boolean(isSecondary)}
              />
            </div>
          );
        })}

      </div>
    </div>
  );
};

export default MonthView;