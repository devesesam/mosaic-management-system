import { useEffect, useRef } from 'react';
import { supabase } from '../api/supabaseClient';
import { useJobsStore } from '../store/jobsStore';
import { logger } from '../utils/logger';

/**
 * Hook that subscribes to real-time changes on the jobs table.
 * When jobs are inserted, updated, or deleted by other clients,
 * this hook triggers a refresh of the jobs store.
 */
export function useRealtimeJobs() {
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const isSubscribedRef = useRef(false);

  useEffect(() => {
    // Avoid duplicate subscriptions
    if (isSubscribedRef.current) return;
    isSubscribedRef.current = true;

    logger.debug('useRealtimeJobs: Setting up subscription');

    // Create a channel for jobs table changes
    subscriptionRef.current = supabase
      .channel('jobs-realtime-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'jobs'
        },
        (payload) => {
          logger.debug('useRealtimeJobs: Received change event', payload.eventType);

          // Refresh jobs from the store
          // We use getState() to avoid stale closure issues
          useJobsStore.getState().fetchJobs();
        }
      )
      .subscribe((status) => {
        logger.debug('useRealtimeJobs: Subscription status:', status);
      });

    // Cleanup on unmount
    return () => {
      logger.debug('useRealtimeJobs: Cleaning up subscription');
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
      isSubscribedRef.current = false;
    };
  }, []);
}
