import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../api/supabaseClient';
import { TeamMember } from '../types';
import { teamKeys } from './useTeamMembers';
import { logger } from '../utils/logger';

/**
 * Hook that subscribes to real-time changes on the workers (team members) table.
 * Uses incremental updates via React Query cache instead of full refetch.
 */
export function useRealtimeTeam() {
  const queryClient = useQueryClient();
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const isSubscribedRef = useRef(false);

  useEffect(() => {
    // Avoid duplicate subscriptions
    if (isSubscribedRef.current) return;
    isSubscribedRef.current = true;

    logger.debug('useRealtimeTeam: Setting up subscription');

    // Create a channel for workers table changes
    subscriptionRef.current = supabase
      .channel('team-realtime-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'workers',
        },
        (payload) => {
          logger.debug('useRealtimeTeam: INSERT event', payload.new);
          const newMember = payload.new as TeamMember;

          queryClient.setQueryData<TeamMember[]>(teamKeys.list(), (old) => {
            if (!old) return [newMember];
            if (old.some((m) => m.id === newMember.id)) return old;
            return [...old, newMember];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'workers',
        },
        (payload) => {
          logger.debug('useRealtimeTeam: UPDATE event', payload.new);
          const updatedMember = payload.new as TeamMember;

          queryClient.setQueryData<TeamMember[]>(teamKeys.list(), (old) => {
            if (!old) return old;
            return old.map((m) => (m.id === updatedMember.id ? updatedMember : m));
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'workers',
        },
        (payload) => {
          logger.debug('useRealtimeTeam: DELETE event', payload.old);
          const deletedId = (payload.old as { id: string }).id;

          queryClient.setQueryData<TeamMember[]>(teamKeys.list(), (old) => {
            if (!old) return old;
            return old.filter((m) => m.id !== deletedId);
          });
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
  }, [queryClient]);
}
