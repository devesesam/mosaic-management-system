import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../api/supabaseClient';
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
          // Invalidate all task queries to refetch with new data
          // We use invalidateQueries because tasks can be filtered by workerId/isAdmin,
          // and we don't know which cache keys to update specifically
          queryClient.invalidateQueries({ queryKey: taskKeys.all });
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
          // Invalidate all task queries to refetch with updated data
          queryClient.invalidateQueries({ queryKey: taskKeys.all });
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
          // Invalidate all task queries to refetch without deleted task
          queryClient.invalidateQueries({ queryKey: taskKeys.all });
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
