import { useEffect, useRef } from 'react';
import { supabase } from '../api/supabaseClient';
import { useTasksStore } from '../store/tasksStore';
import { logger } from '../utils/logger';

/**
 * Hook that subscribes to real-time changes on the tasks table.
 * When tasks are inserted, updated, or deleted by other clients,
 * this hook triggers a refresh of the tasks store.
 */
export function useRealtimeTasks(workerId?: string, isAdmin?: boolean) {
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
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'tasks'
        },
        (payload) => {
          logger.debug('useRealtimeTasks: Received change event', payload.eventType);

          // Refresh tasks from the store
          // We use getState() to avoid stale closure issues
          useTasksStore.getState().fetchTasks(workerId, isAdmin);
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
  }, []);
}

// Backwards compatibility alias
export const useRealtimeJobs = useRealtimeTasks;
