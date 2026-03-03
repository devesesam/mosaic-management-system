import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Task } from '../types';
import { logger } from '../utils/logger';
import toast from 'react-hot-toast';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Query keys for cache management
// IMPORTANT: Use a single key for all task queries to enable optimistic updates
export const taskKeys = {
  all: ['tasks'] as const,
};

// API functions
async function fetchTasks(workerId?: string, isAdmin?: boolean): Promise<Task[]> {
  const url = new URL(`${supabaseUrl}/functions/v1/get-tasks`);
  if (workerId) url.searchParams.append('workerId', workerId);
  if (isAdmin) url.searchParams.append('isAdmin', String(isAdmin));

  logger.debug('useTasks: Fetching tasks from:', url.toString());

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();

  if (data.success && data.data) {
    logger.debug('useTasks: Fetched', data.data.length, 'tasks');
    return data.data;
  }

  throw new Error(data.error || 'Failed to fetch tasks');
}

async function addTaskApi(taskData: Omit<Task, 'id' | 'created_at'>): Promise<Task> {
  logger.debug('useTasks: Adding task:', taskData);

  const response = await fetch(`${supabaseUrl}/functions/v1/add-task`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(taskData),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();

  if (data.success && data.data) {
    logger.debug('useTasks: Task created:', data.data.id);
    return data.data;
  }

  throw new Error(data.error || 'Failed to create task');
}

async function updateTaskApi(id: string, updates: Partial<Task>): Promise<Task> {
  logger.debug('useTasks: Updating task:', id, updates);

  const response = await fetch(`${supabaseUrl}/functions/v1/update-task`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ id, updates }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();

  if (data.success && data.data) {
    logger.debug('useTasks: Task updated:', id);
    return data.data;
  }

  throw new Error(data.error || 'Failed to update task');
}

async function deleteTaskApi(id: string): Promise<void> {
  logger.debug('useTasks: Deleting task:', id);

  const response = await fetch(`${supabaseUrl}/functions/v1/delete-task/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Failed to delete task');
  }

  logger.debug('useTasks: Task deleted:', id);
}

// React Query hooks

/**
 * Hook to fetch all tasks with caching and automatic deduplication
 */
export function useTasksQuery(workerId?: string, isAdmin?: boolean) {
  return useQuery({
    queryKey: taskKeys.all,
    queryFn: () => fetchTasks(workerId, isAdmin),
  });
}

/**
 * Hook to add a new task with optimistic updates
 */
export function useAddTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: addTaskApi,
    onSuccess: (newTask) => {
      // Instantly add new task to cache
      queryClient.setQueryData<Task[]>(taskKeys.all, (old) => {
        if (!old) return [newTask];
        // Avoid duplicates
        if (old.some((t) => t.id === newTask.id)) return old;
        return [newTask, ...old];
      });
      toast.success('Task created successfully');
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to add task';
      toast.error(message);
      logger.error('useTasks: Error adding task:', error);
    },
  });
}

/**
 * Hook to update an existing task with optimistic updates
 */
export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Task> }) =>
      updateTaskApi(id, updates),
    onMutate: async ({ id, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: taskKeys.all });

      // Snapshot previous value
      const previousTasks = queryClient.getQueryData<Task[]>(taskKeys.all);

      // Instantly update cache (optimistic)
      queryClient.setQueryData<Task[]>(taskKeys.all, (old) => {
        if (!old) return old;
        return old.map((task) =>
          task.id === id ? { ...task, ...updates } : task
        );
      });

      return { previousTasks };
    },
    onSuccess: (updatedTask) => {
      // Replace optimistic update with actual server data
      queryClient.setQueryData<Task[]>(taskKeys.all, (old) => {
        if (!old) return old;
        return old.map((task) =>
          task.id === updatedTask.id ? updatedTask : task
        );
      });
      toast.success('Task updated successfully');
    },
    onError: (error, _, context) => {
      // Rollback on error
      if (context?.previousTasks) {
        queryClient.setQueryData(taskKeys.all, context.previousTasks);
      }
      const message = error instanceof Error ? error.message : 'Failed to update task';
      toast.error(message);
      logger.error('useTasks: Error updating task:', error);
    },
  });
}

/**
 * Hook to delete a task with optimistic updates
 */
export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteTaskApi,
    onMutate: async (id) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: taskKeys.all });

      // Snapshot previous value
      const previousTasks = queryClient.getQueryData<Task[]>(taskKeys.all);

      // Instantly remove from cache (optimistic)
      queryClient.setQueryData<Task[]>(taskKeys.all, (old) => {
        if (!old) return old;
        return old.filter((task) => task.id !== id);
      });

      return { previousTasks };
    },
    onSuccess: () => {
      toast.success('Task deleted successfully');
    },
    onError: (error, _, context) => {
      // Rollback on error
      if (context?.previousTasks) {
        queryClient.setQueryData(taskKeys.all, context.previousTasks);
      }
      const message = error instanceof Error ? error.message : 'Failed to delete task';
      toast.error(message);
      logger.error('useTasks: Error deleting task:', error);
    },
  });
}

/**
 * Hook to unassign all tasks from a worker
 */
export function useUnassignWorkerTasks() {
  const queryClient = useQueryClient();
  const updateTask = useUpdateTask();

  return useMutation({
    mutationFn: async (workerId: string) => {
      const tasks = queryClient.getQueryData<Task[]>(taskKeys.all) || [];
      const tasksToUpdate = tasks.filter((task) => task.worker_id === workerId);

      logger.debug('useTasks: Unassigning', tasksToUpdate.length, 'tasks from worker', workerId);

      for (const task of tasksToUpdate) {
        await updateTask.mutateAsync({
          id: task.id,
          updates: { worker_id: null, start_date: null, end_date: null },
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
    },
  });
}

/**
 * Helper to manually update the tasks cache
 */
export function useTasksCacheUpdater() {
  const queryClient = useQueryClient();

  return {
    addTask: (task: Task) => {
      queryClient.setQueryData<Task[]>(taskKeys.all, (old) => {
        if (!old) return [task];
        if (old.some((t) => t.id === task.id)) return old;
        return [task, ...old];
      });
    },
    updateTask: (task: Task) => {
      queryClient.setQueryData<Task[]>(taskKeys.all, (old) => {
        if (!old) return old;
        return old.map((t) => (t.id === task.id ? task : t));
      });
    },
    removeTask: (taskId: string) => {
      queryClient.setQueryData<Task[]>(taskKeys.all, (old) => {
        if (!old) return old;
        return old.filter((t) => t.id !== taskId);
      });
    },
    invalidate: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
    },
  };
}
