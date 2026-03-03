import { useEffect, useRef } from 'react';
import { supabase } from '../api/supabaseClient';
import { useTeamStore } from '../store/teamStore';
import { logger } from '../utils/logger';

/**
 * Hook that subscribes to real-time changes on the workers (team members) table.
 * When team members are inserted, updated, or deleted by other clients,
 * this hook triggers a refresh of the team store.
 */
export function useRealtimeTeam() {
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const isSubscribedRef = useRef(false);

  useEffect(() => {
    // Avoid duplicate subscriptions
    if (isSubscribedRef.current) return;
    isSubscribedRef.current = true;

    logger.debug('useRealtimeTeam: Setting up subscription');

    // Create a channel for workers table changes
    // Note: table is 'workers' in Supabase, even though we call them 'team members' in the UI
    subscriptionRef.current = supabase
      .channel('team-realtime-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'workers'
        },
        (payload) => {
          logger.debug('useRealtimeTeam: Received change event', payload.eventType);

          // Refresh team members from the store
          // We use getState() to avoid stale closure issues
          useTeamStore.getState().fetchTeamMembers();
        }
      )
      .subscribe((status) => {
        logger.debug('useRealtimeTeam: Subscription status:', status);
      });

    // Cleanup on unmount
    return () => {
      logger.debug('useRealtimeTeam: Cleaning up subscription');
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
      isSubscribedRef.current = false;
    };
  }, []);
}
