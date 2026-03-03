import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Task } from '../types';
import { logger } from '../utils/logger';
import toast from 'react-hot-toast';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Query keys for cache management
export const taskKeys = {
  all: ['tasks'] as const,
  list: (workerId?: string, isAdmin?: boolean) => [...taskKeys.all, { workerId, isAdmin }] as const,
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
    queryKey: taskKeys.list(workerId, isAdmin),
    queryFn: () => fetchTasks(workerId, isAdmin),
  });
}

/**
 * Hook to add a new task with cache invalidation
 */
export function useAddTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: addTaskApi,
    onSuccess: () => {
      // Invalidate all task queries to refetch with new data
      // We invalidate instead of setQueryData because queries use variable keys
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
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
 * Hook to update an existing task with cache invalidation
 */
export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Task> }) =>
      updateTaskApi(id, updates),
    onSuccess: () => {
      // Invalidate all task queries to refetch with updated data
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
      toast.success('Task updated successfully');
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to update task';
      toast.error(message);
      logger.error('useTasks: Error updating task:', error);
    },
  });
}

/**
 * Hook to delete a task with cache invalidation
 */
export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteTaskApi,
    onSuccess: () => {
      // Invalidate all task queries to refetch without deleted task
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
      toast.success('Task deleted successfully');
    },
    onError: (error) => {
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
 * Helper to manually invalidate the tasks cache
 * Note: Direct cache updates (setQueryData) don't work because queries use variable keys.
 * Always use invalidate() to trigger a refetch.
 */
export function useTasksCacheUpdater() {
  const queryClient = useQueryClient();

  return {
    invalidate: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
    },
  };
}
