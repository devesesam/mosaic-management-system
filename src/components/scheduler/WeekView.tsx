import React, { useState, useEffect, useCallback } from 'react';
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addWeeks,
  subWeeks,
  parseISO,
  addDays,
  differenceInDays,
  isSameDay
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Task, TeamMember } from '../../types';
import CalendarGrid from './CalendarGrid';
import UnscheduledPanel from './UnscheduledPanel';
import GlobalTaskSearch from './GlobalTaskSearch';
import { useTasksQuery, useAddTask, useUpdateTask, useDeleteTask } from '../../hooks/useTasks';
import { useTeamMembersQuery, useAddTeamMember } from '../../hooks/useTeamMembers';
import { useAuth } from '../../context/AuthContext';
import { TaskForm } from '../tasks';
import TeamMemberForm from '../team/TeamMemberForm';
import toast from 'react-hot-toast';

interface WeekViewProps {
  readOnly?: boolean;
}

const WeekView: React.FC<WeekViewProps> = ({ readOnly = false }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [isTeamMemberFormOpen, setIsTeamMemberFormOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
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

  // Get auth context first (needed for queries)
  const { user, currentWorker } = useAuth();

  // React Query hooks for data access
  const {
    data: tasks = [],
    isLoading: tasksLoading,
    error: tasksQueryError,
    refetch: refetchTasks,
  } = useTasksQuery(currentWorker?.id, false);

  const {
    data: teamMembers = [],
    isLoading: teamLoading,
    error: teamQueryError,
    refetch: refetchTeamMembers,
  } = useTeamMembersQuery();

  // Mutations
  const addTaskMutation = useAddTask();
  const updateTaskMutation = useUpdateTask();
  const deleteTaskMutation = useDeleteTask();
  const addTeamMemberMutation = useAddTeamMember();

  // Convert query errors to strings
  const tasksError = tasksQueryError?.message || null;
  const teamError = teamQueryError?.message || null;

  // Get start and end of week
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });

  // Generate days of week
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Handle week navigation
  const prevWeek = () => setCurrentDate(subWeeks(currentDate, 1));
  const nextWeek = () => setCurrentDate(addWeeks(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  // Debug log tasks data
  useEffect(() => {
    if (tasks.length > 0) {
      console.log('WeekView: Tasks loaded:', tasks.length);
    }
  }, [tasks]);

  // Debug log the team members data
  useEffect(() => {
    if (teamMembers.length > 0) {
      console.log('WeekView: Team members loaded:', teamMembers.length);
    }
  }, [teamMembers]);

  // Get unscheduled tasks - filter for read-only mode
  const unscheduledTasks = React.useMemo(() => {
    const baseUnscheduled = tasks.filter(task => !task.worker_id || !task.start_date);

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

  // PRE-COMPUTE worker-day task assignments for O(1) lookups
  // This replaces the O(n) filter on every getWorkerDayTasks call
  const workerDayTasksMap = React.useMemo(() => {
    const map = new Map<string, Task[]>();

    // Pre-format day keys for the week
    const dayKeys = weekDays.map(d => format(d, 'yyyy-MM-dd'));

    tasks.forEach(task => {
      if (!task.start_date) return;

      try {
        const taskStart = parseISO(task.start_date);
        const taskEnd = task.end_date ? parseISO(task.end_date) : taskStart;

        // For each day in the week, check if task spans that day
        weekDays.forEach((day, dayIdx) => {
          const dayKey = dayKeys[dayIdx];

          // Check if task spans this day
          const isOnDay = (day >= taskStart && day <= taskEnd) ||
            format(taskStart, 'yyyy-MM-dd') === dayKey ||
            format(taskEnd, 'yyyy-MM-dd') === dayKey;

          if (!isOnDay) return;

          // Determine which worker rows this task appears on
          const workerIds: (string | null)[] = [];

          if (!task.worker_id && (!task.secondary_worker_ids || task.secondary_worker_ids.length === 0)) {
            workerIds.push(null); // Unassigned row
          } else {
            if (task.worker_id) workerIds.push(task.worker_id);
            if (task.secondary_worker_ids) {
              workerIds.push(...task.secondary_worker_ids);
            }
          }

          workerIds.forEach(workerId => {
            const key = `${workerId || 'null'}-${dayKey}`;
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(task);
          });
        });
      } catch (error) {
        console.error('Error processing task dates:', error, task);
      }
    });

    return map;
  }, [tasks, weekDays]);

  // Fast O(1) lookup for tasks on a specific worker-day combination
  const getWorkerDayTasks = useCallback((workerId: string | null, day: Date): Task[] => {
    const key = `${workerId || 'null'}-${format(day, 'yyyy-MM-dd')}`;
    const result = workerDayTasksMap.get(key) || [];

    // In read-only mode, filter to only show tasks where current worker is involved
    if (readOnly && currentWorker) {
      return result.filter(task =>
        task.worker_id === currentWorker.id ||
        (task.secondary_worker_ids && task.secondary_worker_ids.includes(currentWorker.id))
      );
    }

    return result;
  }, [workerDayTasksMap, readOnly, currentWorker]);

  const handleSubmitTask = async (taskData: Omit<Task, 'id' | 'created_at'>) => {
    if (readOnly) {
      toast.error('Cannot modify tasks in read-only mode');
      return;
    }

    try {
      if (selectedTask) {
        await updateTaskMutation.mutateAsync({ id: selectedTask.id, updates: taskData });
      } else {
        await addTaskMutation.mutateAsync(taskData);
      }
      setIsTaskFormOpen(false);
      setSelectedTask(null);
    } catch (error) {
      console.error('Error saving task:', error);
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (readOnly) {
      toast.error('Cannot delete tasks in read-only mode');
      return;
    }

    try {
      await deleteTaskMutation.mutateAsync(id);
      setIsTaskFormOpen(false);
      setSelectedTask(null);
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const handleSubmitTeamMember = async (memberData: Omit<TeamMember, 'id' | 'created_at'>) => {
    if (readOnly) {
      toast.error('Cannot add team members in read-only mode');
      return;
    }

    try {
      console.log('WeekView: Submitting team member:', memberData);

      // Wait for the team member to be added
      await addTeamMemberMutation.mutateAsync(memberData);

      console.log('WeekView: Team member added successfully');
      setIsTeamMemberFormOpen(false);
    } catch (error) {
      console.error('WeekView: Error adding team member:', error);
    }
  };

  const handleTaskDrop = async (task: Task, workerId: string | null, date: Date | null) => {
    if (readOnly) {
      toast.error('Cannot move tasks in read-only mode');
      return;
    }

    try {
      let updates: Partial<Task> = {
        worker_id: workerId,
        start_date: date ? date.toISOString() : null
      };

      // CRITICAL: If unassigning a task (workerId is null), also clear secondary workers
      if (workerId === null) {
        console.log('WeekView: Unassigning task - clearing secondary workers');
        updates.secondary_worker_ids = [];
      }

      // Calculate end date to preserve the task's duration
      if (date && task.start_date && task.end_date) {
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

          console.log('WeekView: Preserving task duration:', {
            task_id: task.id,
            original_start: task.start_date,
            original_end: task.end_date,
            original_duration_days: durationInDays,
            new_start: date.toISOString(),
            new_end: newEndDate.toISOString()
          });
        } catch (error) {
          console.error('Error calculating task duration:', error);
          // Fallback to single-day task
          updates.end_date = date.toISOString();
        }
      } else if (date) {
        // New task or task without existing dates - make it a single-day task
        updates.end_date = date.toISOString();
      } else {
        // Unscheduling the task
        updates.end_date = null;
      }

      console.log('WeekView: Updating task with drop info:', {
        task_id: task.id,
        updates
      });

      await updateTaskMutation.mutateAsync({ id: task.id, updates });
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to move task. Please try again.');
    }
  };

  const handleTaskResize = async (task: Task, days: number) => {
    if (readOnly) {
      toast.error('Cannot resize tasks in read-only mode');
      return;
    }

    try {
      console.log('WeekView: Resize started with:', {
        task_id: task.id,
        days,
        days_type: typeof days,
        start_date: task.start_date
      });

      // Validate the days parameter
      if (typeof days !== 'number' || isNaN(days) || days < 1) {
        console.error('Invalid days parameter for task resize:', days);
        toast.error('Cannot resize task: invalid duration');
        return;
      }

      if (!task.start_date) {
        console.error('Cannot resize task without start_date');
        toast.error('Cannot resize task: no start date');
        return;
      }

      const startDate = parseISO(task.start_date);

      // Check if the parsed start date is valid
      if (isNaN(startDate.getTime())) {
        console.error('Invalid start_date for task:', task.start_date);
        toast.error('Cannot resize task: invalid start date');
        return;
      }

      const newEndDate = addDays(startDate, days - 1);

      // Check if the calculated end date is valid
      if (isNaN(newEndDate.getTime())) {
        console.error('Invalid calculated end date:', {
          start_date: task.start_date,
          days,
          calculation: `addDays(${startDate}, ${days - 1})`
        });
        toast.error('Cannot resize task: invalid end date calculation');
        return;
      }

      console.log('WeekView: Resizing task:', {
        task_id: task.id,
        days,
        start_date: task.start_date,
        parsed_start_date: startDate.toISOString(),
        new_end_date: newEndDate.toISOString()
      });

      await updateTaskMutation.mutateAsync({
        id: task.id,
        updates: { end_date: newEndDate.toISOString() }
      });
    } catch (error) {
      console.error('Error resizing task:', error);
      toast.error('Failed to resize task. Please try again.');
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Week navigation header */}
      <div className="flex items-center justify-between p-2 bg-white border-b border-gray-200">
        {/* Left: Navigation */}
        <div className="flex items-center space-x-2 flex-shrink-0">
          <button
            onClick={prevWeek}
            className="p-1 rounded-full hover:bg-gray-200 transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-gray-600" />
          </button>
          <h2 className="text-lg font-semibold text-gray-800 whitespace-nowrap">
            {format(weekStart, 'MMMM d')} - {format(weekEnd, 'MMMM d, yyyy')}
          </h2>
          <button
            onClick={nextWeek}
            className="p-1 rounded-full hover:bg-gray-200 transition-colors"
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
      {teamError && (
        <div className="px-4 py-2 bg-red-50 border-b border-red-100 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-red-700">Error loading team members: {teamError}</span>
            <button
              onClick={() => {
                setIsRetrying(true);
                refetchTeamMembers();
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

      {tasksError && (
        <div className="px-4 py-2 bg-red-50 border-b border-red-100 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-red-700">Error loading tasks: {tasksError}</span>
            <button
              onClick={() => {
                setIsRetrying(true);
                refetchTasks();
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
      {!teamLoading && !teamError && teamMembers.length === 0 && (
        <div className="px-4 py-2 bg-yellow-50 border-b border-yellow-100 text-sm">
          <span className="text-yellow-700">No team members found. Add a team member to start scheduling tasks.</span>
        </div>
      )}

      {!tasksLoading && !tasksError && tasks.length === 0 && (
        <div className="px-4 py-2 bg-yellow-50 border-b border-yellow-100 text-sm">
          <span className="text-yellow-700">No tasks found. Add tasks to start scheduling.</span>
        </div>
      )}

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Calendar grid */}
        <div className="flex-1 overflow-auto min-w-0">
          <CalendarGrid
            days={weekDays}
            teamMembers={teamMembers}
            allTasks={tasks}
            getWorkerDayTasks={getWorkerDayTasks}
            onTaskDrop={handleTaskDrop}
            onTaskClick={(task) => {
              setSelectedTask(task);
              setIsTaskFormOpen(true);
            }}
            onTaskResize={handleTaskResize}
            onNewWorker={() => setIsTeamMemberFormOpen(true)}
            readOnly={readOnly}
          />
        </div>

        {/* Fixed-width unscheduled tasks panel - only show for edit mode */}
        {!readOnly && (
          <UnscheduledPanel
            tasks={unscheduledTasks}
            onTaskDrop={handleTaskDrop}
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

      {/* Team member form modal */}
      {isTeamMemberFormOpen && (
        <TeamMemberForm
          onClose={() => setIsTeamMemberFormOpen(false)}
          onSubmit={handleSubmitTeamMember}
          readOnly={readOnly}
        />
      )}
    </div>
  );
};

export default WeekView;