import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../api/supabaseClient';
import { Task } from '../types';
import { taskKeys } from './useTasks';
import { logger } from '../utils/logger';

/**
 * Hook that subscribes to real-time changes on the tasks table.
 * Uses incremental updates via React Query cache instead of full refetch.
 */
export function useRealtimeTasks() {
  const queryClient = useQueryClient();
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const isSubscribedRef = useRef(false);

  useEffect(() => {
    // Avoid duplicate subscriptions
    if (isSubscribedRef.current) return;
    isSubscribedRef.current = true;

    logger.debug('useRealtimeTasks: Setting up subscription');

    // Create a channel for tasks table changes
    subscriptionRef.current = supabase
      .channel('tasks-realtime-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tasks',
        },
        (payload) => {
          logger.debug('useRealtimeTasks: INSERT event', payload.new);
          const newTask = payload.new as Task;

          // Add to cache if not already present
          queryClient.setQueryData<Task[]>(taskKeys.all, (old) => {
            if (!old) return [newTask];
            // Avoid duplicates (might be our own optimistic update)
            if (old.some((t) => t.id === newTask.id)) return old;
            return [newTask, ...old];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tasks',
        },
        (payload) => {
          logger.debug('useRealtimeTasks: UPDATE event', payload.new);
          const updatedTask = payload.new as Task;

          // Update in cache
          queryClient.setQueryData<Task[]>(taskKeys.all, (old) => {
            if (!old) return old;
            return old.map((t) => (t.id === updatedTask.id ? updatedTask : t));
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'tasks',
        },
        (payload) => {
          logger.debug('useRealtimeTasks: DELETE event', payload.old);
          const deletedId = (payload.old as { id: string }).id;

          // Remove from cache
          queryClient.setQueryData<Task[]>(taskKeys.all, (old) => {
            if (!old) return old;
            return old.filter((t) => t.id !== deletedId);
          });
        }
      )
      .subscribe((status) => {
        logger.debug('useRealtimeTasks: Subscription status:', status);
      });

    // Cleanup on unmount
    return () => {
      logger.debug('useRealtimeTasks: Cleaning up subscription');
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
      isSubscribedRef.current = false;
    };
  }, [queryClient]);
}

// Backwards compatibility alias
export const useRealtimeJobs = useRealtimeTasks;
