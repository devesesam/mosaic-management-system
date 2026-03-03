import { create } from 'zustand';
import { Task } from '../types';
import toast from 'react-hot-toast';
import { logger } from '../utils/logger';

interface TasksState {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  selectedTask: Task | null;
  fetchTasks: () => Promise<void>;
  addTask: (task: Omit<Task, 'id' | 'created_at'>) => Promise<Task>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<Task>;
  deleteTask: (id: string) => Promise<void>;
  setSelectedTask: (task: Task | null) => void;
  unassignWorkerTasks: (workerId: string) => Promise<void>;
  isLoading: boolean;
}

export const useTasksStore = create<TasksState>((set, get) => ({
  tasks: [],
  loading: false,
  error: null,
  selectedTask: null,
  isLoading: false,

  fetchTasks: async () => {
    set({ loading: true, error: null, isLoading: true });
    logger.debug('tasksStore: Fetching tasks - using edge function');

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const apiUrl = `${supabaseUrl}/functions/v1/get-tasks`;

      logger.debug('tasksStore: Fetching tasks from edge function:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      logger.debug('tasksStore: Tasks response status:', response.status);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      logger.debug('tasksStore: Tasks response:', data);

      if (data.success && data.data) {
        const tasks = data.data;
        logger.debug('tasksStore: Fetched', tasks.length, 'tasks');
        set({ tasks, loading: false, error: null, isLoading: false });
      } else {
        throw new Error(data.error || 'Failed to fetch tasks');
      }
    } catch (error) {
      logger.error('tasksStore: Error fetching tasks:', error);

      // Create a user-friendly error message
      const errorMessage = error instanceof Error
        ? error.message
        : 'Failed to fetch tasks - check your network connection';

      set({ error: errorMessage, loading: false, isLoading: false });
      toast.error(errorMessage);
    }
  },

  addTask: async (taskData) => {
    set({ loading: true, error: null, isLoading: true });
    logger.debug('tasksStore: Adding task:', taskData);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const apiUrl = `${supabaseUrl}/functions/v1/add-task`;

      logger.debug('tasksStore: Adding task via edge function:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(taskData)
      });

      logger.debug('tasksStore: Add task response status:', response.status);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      logger.debug('tasksStore: Add task response:', data);

      if (data.success && data.data) {
        const newTask = data.data;
        logger.debug('tasksStore: Task created successfully:', newTask.id);

        // Update local state immediately
        set((state) => ({
          tasks: [newTask, ...state.tasks],
          loading: false,
          error: null,
          isLoading: false
        }));

        toast.success('Task created successfully');

        // Optimistic update - trust local state, no refetch needed
        return newTask;
      } else {
        throw new Error(data.error || 'Failed to create task');
      }
    } catch (error) {
      logger.error('tasksStore: Error adding task:', error);

      // Create a user-friendly error message
      let errorMessage = 'Failed to add task - please try again';

      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          errorMessage = 'Request timed out - please check your connection and try again';
        } else if (error.message.includes('network')) {
          errorMessage = 'Network error - please check your connection';
        } else {
          errorMessage = error.message;
        }
      }

      set({ error: errorMessage, loading: false, isLoading: false });
      toast.error(errorMessage);
      throw error;
    }
  },

  updateTask: async (id, updates) => {
    set({ loading: true, error: null, isLoading: true });
    logger.debug('tasksStore: Updating task:', id, updates);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const apiUrl = `${supabaseUrl}/functions/v1/update-task`;

      logger.debug('tasksStore: Updating task via edge function:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, updates })
      });

      logger.debug('tasksStore: Update task response status:', response.status);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      logger.debug('tasksStore: Update task response:', data);

      if (data.success && data.data) {
        const updatedTask = data.data;
        logger.debug('tasksStore: Task updated successfully:', id);

        // Update local state immediately
        set((state) => ({
          tasks: state.tasks.map(task => task.id === id ? updatedTask : task),
          loading: false,
          error: null,
          isLoading: false
        }));

        toast.success('Task updated successfully');

        // Optimistic update - trust local state, no refetch needed
        return updatedTask;
      } else {
        throw new Error(data.error || 'Failed to update task');
      }
    } catch (error) {
      logger.error('tasksStore: Error updating task:', error);

      // Create a user-friendly error message
      let errorMessage = 'Failed to update task - please try again';

      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          errorMessage = 'Request timed out - please check your connection and try again';
        } else if (error.message.includes('network')) {
          errorMessage = 'Network error - please check your connection';
        } else {
          errorMessage = error.message;
        }
      }

      set({ error: errorMessage, loading: false, isLoading: false });
      toast.error(errorMessage);
      throw error;
    }
  },

  deleteTask: async (id) => {
    set({ loading: true, error: null, isLoading: true });
    logger.debug('tasksStore: Deleting task:', id);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const apiUrl = `${supabaseUrl}/functions/v1/delete-task/${id}`;

      logger.debug('tasksStore: Deleting task via edge function:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      logger.debug('tasksStore: Delete task response status:', response.status);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      logger.debug('tasksStore: Delete task response:', data);

      if (data.success) {
        logger.debug('tasksStore: Task deleted successfully:', id);

        // Update local state
        set((state) => ({
          tasks: state.tasks.filter(task => task.id !== id),
          loading: false,
          error: null,
          isLoading: false
        }));

        toast.success('Task deleted successfully');

        // Optimistic update - trust local state, no refetch needed
      } else {
        throw new Error(data.error || 'Failed to delete task');
      }
    } catch (error) {
      logger.error('tasksStore: Error deleting task:', error);

      // Create a user-friendly error message
      let errorMessage = 'Failed to delete task - please try again';

      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          errorMessage = 'Request timed out - please check your connection and try again';
        } else if (error.message.includes('network')) {
          errorMessage = 'Network error - please check your connection';
        } else {
          errorMessage = error.message;
        }
      }

      set({ error: errorMessage, loading: false, isLoading: false });
      toast.error(errorMessage);
      throw error;
    }
  },

  setSelectedTask: (task) => {
    set({ selectedTask: task });
  },

  unassignWorkerTasks: async (workerId) => {
    const state = get();
    const tasksToUpdate = state.tasks.filter(task => task.worker_id === workerId);

    logger.debug('tasksStore: Unassigning', tasksToUpdate.length, 'tasks from worker', workerId);

    // Update each task to unassign the worker
    for (const task of tasksToUpdate) {
      try {
        await get().updateTask(task.id, {
          worker_id: null,
          start_date: null,
          end_date: null
        });
      } catch (error) {
        logger.error(`Failed to unassign task ${task.id}:`, error);
      }
    }

    // Refresh tasks after unassigning
    await get().fetchTasks();
  }
}));

// ============================================================================
// SELECTORS - Use these for optimized re-renders
// Components using selectors only re-render when their specific data changes
// ============================================================================

/** Select only the tasks array - prevents re-renders from loading/error changes */
export const useTasks = () => useTasksStore((state) => state.tasks);

/** Select only the loading state */
export const useTasksLoading = () => useTasksStore((state) => state.isLoading);

/** Select only the error state */
export const useTasksError = () => useTasksStore((state) => state.error);

/** Select only the selected task */
export const useSelectedTask = () => useTasksStore((state) => state.selectedTask);

/** Select only the action functions - these never change, so components using this won't re-render */
export const useTaskActions = () => useTasksStore((state) => ({
  fetchTasks: state.fetchTasks,
  addTask: state.addTask,
  updateTask: state.updateTask,
  deleteTask: state.deleteTask,
  setSelectedTask: state.setSelectedTask,
  unassignWorkerTasks: state.unassignWorkerTasks
}));

// ============================================================================
// BACKWARDS COMPATIBILITY ALIASES
// ============================================================================
export const useJobsStore = useTasksStore;
export const useJobs = useTasks;
export const useJobsLoading = useTasksLoading;
export const useJobsError = useTasksError;
export const useSelectedJob = useSelectedTask;
export const useJobActions = useTaskActions;
