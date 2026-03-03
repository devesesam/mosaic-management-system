import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TeamMember } from '../types';
import { logger } from '../utils/logger';
import toast from 'react-hot-toast';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Query keys for cache management
export const teamKeys = {
  all: ['teamMembers'] as const,
  list: () => [...teamKeys.all, 'list'] as const,
};

// API functions
async function fetchTeamMembers(): Promise<TeamMember[]> {
  logger.debug('useTeamMembers: Fetching team members');

  const response = await fetch(`${supabaseUrl}/functions/v1/get-workers`, {
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
    logger.debug('useTeamMembers: Fetched', data.data.length, 'team members');
    return data.data;
  }

  throw new Error(data.error || 'Failed to fetch team members');
}

async function addTeamMemberApi(
  teamMemberData: Omit<TeamMember, 'id' | 'created_at'>
): Promise<TeamMember> {
  logger.debug('useTeamMembers: Adding team member:', teamMemberData);

  const response = await fetch(`${supabaseUrl}/functions/v1/add-worker`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(teamMemberData),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();

  if (data.success && data.data) {
    logger.debug('useTeamMembers: Team member created:', data.data.id);
    return data.data;
  }

  throw new Error(data.error || 'Failed to create team member');
}

async function updateTeamMemberApi(
  id: string,
  updates: Partial<Omit<TeamMember, 'id' | 'created_at'>>
): Promise<TeamMember> {
  logger.debug('useTeamMembers: Updating team member:', id, updates);

  const response = await fetch(`${supabaseUrl}/functions/v1/update-worker`, {
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
    logger.debug('useTeamMembers: Team member updated:', id);
    return data.data;
  }

  throw new Error(data.error || 'Failed to update team member');
}

async function deleteTeamMemberApi(id: string): Promise<void> {
  logger.debug('useTeamMembers: Deleting team member:', id);

  const response = await fetch(`${supabaseUrl}/functions/v1/delete-worker/${id}`, {
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
    throw new Error(data.error || 'Failed to delete team member');
  }

  logger.debug('useTeamMembers: Team member deleted:', id);
}

// React Query hooks

/**
 * Hook to fetch all team members with caching and automatic deduplication
 */
export function useTeamMembersQuery() {
  return useQuery({
    queryKey: teamKeys.list(),
    queryFn: fetchTeamMembers,
  });
}

/**
 * Hook to add a new team member
 */
export function useAddTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: addTeamMemberApi,
    onSuccess: (newMember) => {
      queryClient.setQueryData<TeamMember[]>(teamKeys.list(), (old) => {
        if (!old) return [newMember];
        return [...old, newMember];
      });
      toast.success('Team member added successfully');
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to add team member';
      toast.error(message);
      logger.error('useTeamMembers: Error adding team member:', error);
    },
  });
}

/**
 * Hook to update an existing team member with optimistic updates
 */
export function useUpdateTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Omit<TeamMember, 'id' | 'created_at'>>;
    }) => updateTeamMemberApi(id, updates),
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: teamKeys.list() });

      const previousMembers = queryClient.getQueryData<TeamMember[]>(teamKeys.list());

      queryClient.setQueryData<TeamMember[]>(teamKeys.list(), (old) => {
        if (!old) return old;
        return old.map((member) =>
          member.id === id ? { ...member, ...updates } : member
        );
      });

      return { previousMembers };
    },
    onSuccess: (updatedMember) => {
      queryClient.setQueryData<TeamMember[]>(teamKeys.list(), (old) => {
        if (!old) return old;
        return old.map((member) =>
          member.id === updatedMember.id ? updatedMember : member
        );
      });
      toast.success('Team member updated successfully');
    },
    onError: (error, _, context) => {
      if (context?.previousMembers) {
        queryClient.setQueryData(teamKeys.list(), context.previousMembers);
      }
      const message = error instanceof Error ? error.message : 'Failed to update team member';
      toast.error(message);
      logger.error('useTeamMembers: Error updating team member:', error);
    },
  });
}

/**
 * Hook to delete a team member with optimistic updates
 */
export function useDeleteTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteTeamMemberApi,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: teamKeys.list() });

      const previousMembers = queryClient.getQueryData<TeamMember[]>(teamKeys.list());

      queryClient.setQueryData<TeamMember[]>(teamKeys.list(), (old) => {
        if (!old) return old;
        return old.filter((member) => member.id !== id);
      });

      return { previousMembers };
    },
    onSuccess: () => {
      toast.success('Team member deleted successfully');
    },
    onError: (error, _, context) => {
      if (context?.previousMembers) {
        queryClient.setQueryData(teamKeys.list(), context.previousMembers);
      }
      const message = error instanceof Error ? error.message : 'Failed to delete team member';
      toast.error(message);
      logger.error('useTeamMembers: Error deleting team member:', error);
    },
  });
}

/**
 * Helper to manually update the team members cache (used by real-time subscriptions)
 */
export function useTeamMembersCacheUpdater() {
  const queryClient = useQueryClient();

  return {
    addMember: (member: TeamMember) => {
      queryClient.setQueryData<TeamMember[]>(teamKeys.list(), (old) => {
        if (!old) return [member];
        if (old.some((m) => m.id === member.id)) return old;
        return [...old, member];
      });
    },
    updateMember: (member: TeamMember) => {
      queryClient.setQueryData<TeamMember[]>(teamKeys.list(), (old) => {
        if (!old) return old;
        return old.map((m) => (m.id === member.id ? member : m));
      });
    },
    removeMember: (memberId: string) => {
      queryClient.setQueryData<TeamMember[]>(teamKeys.list(), (old) => {
        if (!old) return old;
        return old.filter((m) => m.id !== memberId);
      });
    },
    invalidate: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.list() });
    },
  };
}
