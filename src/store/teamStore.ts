import { create } from 'zustand';
import { TeamMember } from '../types';
import toast from 'react-hot-toast';
import { logger } from '../utils/logger';

interface TeamState {
  teamMembers: TeamMember[];
  loading: boolean;
  error: string | null;
  fetchTeamMembers: () => Promise<void>;
  addTeamMember: (teamMember: Omit<TeamMember, 'id' | 'created_at'>) => Promise<TeamMember>;
  updateTeamMember: (id: string, updates: Partial<Omit<TeamMember, 'id' | 'created_at'>>) => Promise<TeamMember>;
  deleteTeamMember: (id: string) => Promise<void>;
  isLoading: boolean;
}

export const useTeamStore = create<TeamState>((set, get) => ({
  teamMembers: [],
  loading: false,
  error: null,
  isLoading: false,

  fetchTeamMembers: async () => {
    logger.debug('teamStore: Calling fetchTeamMembers() - using edge function');
    set({ loading: true, error: null, isLoading: true });

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      // Note: Edge function URL kept as 'workers' for Supabase compatibility
      const apiUrl = `${supabaseUrl}/functions/v1/get-workers`;

      logger.debug('teamStore: Fetching team members from edge function:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      logger.debug('teamStore: Team members response status:', response.status);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      logger.debug('teamStore: Team members response:', data);

      if (data.success && data.data) {
        const teamMembers = data.data;
        logger.debug('teamStore: Fetched', teamMembers.length, 'team members');
        set({ teamMembers, loading: false, error: null, isLoading: false });
      } else {
        throw new Error(data.error || 'Failed to fetch team members');
      }
    } catch (error) {
      logger.error('TeamStore: Error fetching team members:', error);

      const errorMessage = error instanceof Error
        ? error.message
        : 'Failed to fetch team members - check your network connection';

      set({ error: errorMessage, loading: false, isLoading: false });
      toast.error(errorMessage);
    }
  },

  addTeamMember: async (teamMemberData) => {
    set({ loading: true, error: null, isLoading: true });

    try {
      logger.debug('teamStore: Adding team member:', teamMemberData);

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      // Note: Edge function URL kept as 'worker' for Supabase compatibility
      const apiUrl = `${supabaseUrl}/functions/v1/add-worker`;

      logger.debug('teamStore: Adding team member via edge function:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(teamMemberData)
      });

      logger.debug('teamStore: Add team member response status:', response.status);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      logger.debug('teamStore: Add team member response:', data);

      if (data.success && data.data) {
        const newTeamMember = data.data;
        logger.debug('teamStore: Team member created successfully:', newTeamMember.id);

        set((state) => ({
          teamMembers: [...state.teamMembers, newTeamMember],
          loading: false,
          error: null,
          isLoading: false
        }));

        toast.success('Team member added successfully');

        return newTeamMember;
      } else {
        throw new Error(data.error || 'Failed to create team member');
      }
    } catch (error) {
      logger.error('TeamStore: Error adding team member:', error);

      const errorMessage = error instanceof Error
        ? error.message
        : 'Failed to add team member - check your network connection';

      set({ error: errorMessage, loading: false, isLoading: false });
      toast.error(errorMessage);
      throw error;
    }
  },

  updateTeamMember: async (id: string, updates: Partial<Omit<TeamMember, 'id' | 'created_at'>>) => {
    set({ loading: true, error: null, isLoading: true });

    try {
      logger.debug('teamStore: Updating team member:', id, updates);

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      // Note: Edge function URL kept as 'worker' for Supabase compatibility
      const apiUrl = `${supabaseUrl}/functions/v1/update-worker`;

      logger.debug('teamStore: Updating team member via edge function:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, updates })
      });

      logger.debug('teamStore: Update team member response status:', response.status);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      logger.debug('teamStore: Update team member response:', data);

      if (data.success && data.data) {
        const updatedTeamMember = data.data;
        logger.debug('teamStore: Team member updated successfully:', updatedTeamMember.id);

        set((state) => ({
          teamMembers: state.teamMembers.map((member) =>
            member.id === id ? updatedTeamMember : member
          ),
          loading: false,
          error: null,
          isLoading: false
        }));

        toast.success('Team member updated successfully');

        return updatedTeamMember;
      } else {
        throw new Error(data.error || 'Failed to update team member');
      }
    } catch (error) {
      logger.error('TeamStore: Error updating team member:', error);

      const errorMessage = error instanceof Error
        ? error.message
        : 'Failed to update team member - check your network connection';

      set({ error: errorMessage, loading: false, isLoading: false });
      toast.error(errorMessage);
      throw error;
    }
  },

  deleteTeamMember: async (id: string) => {
    set({ loading: true, error: null, isLoading: true });

    try {
      logger.debug('teamStore: Deleting team member:', id);

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      // Note: Edge function URL kept as 'worker' for Supabase compatibility
      const apiUrl = `${supabaseUrl}/functions/v1/delete-worker/${id}`;

      logger.debug('teamStore: Deleting team member via edge function:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      logger.debug('teamStore: Delete team member response status:', response.status);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      logger.debug('teamStore: Delete team member response:', data);

      if (data.success) {
        logger.debug('teamStore: Team member deleted successfully:', id);

        set((state) => ({
          teamMembers: state.teamMembers.filter((member) => member.id !== id),
          loading: false,
          error: null,
          isLoading: false
        }));

        toast.success('Team member deleted successfully');

      } else {
        throw new Error(data.error || 'Failed to delete team member');
      }
    } catch (error) {
      logger.error('TeamStore: Error deleting team member:', error);

      const errorMessage = error instanceof Error
        ? error.message
        : 'Failed to delete team member - check your network connection';

      set({ error: errorMessage, loading: false, isLoading: false });
      toast.error(errorMessage);
      throw error;
    }
  }
}));

// Backwards compatibility exports - use useTeamStore instead
export const useWorkerStore = useTeamStore;
