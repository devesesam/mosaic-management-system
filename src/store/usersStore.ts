import { create } from 'zustand';
import { getAllUsers, createUser, updateUser, deleteUser } from '../api/usersApi';
import { User } from '../types';
import toast from 'react-hot-toast';

interface UsersState {
  users: User[];
  loading: boolean;
  error: string | null;
  fetchUsers: () => Promise<void>;
  addUser: (user: Omit<User, 'id' | 'created_at'>) => Promise<User>;
  updateUser: (id: string, updates: Partial<User>) => Promise<User>;
  deleteUser: (id: string) => Promise<void>;
}

export const useUsersStore = create<UsersState>((set, get) => ({
  users: [],
  loading: false,
  error: null,
  
  fetchUsers: async () => {
    console.log('usersStore: Calling fetchUsers()');
    set({ loading: true, error: null });
    console.log('usersStore: Fetching users');
    
    try {
      const users = await getAllUsers();
      console.log('usersStore: Fetched', users.length, 'users');
      set({ users, loading: false, error: null });
    } catch (error) {
      console.error('UsersStore: Error fetching users:', error);
      
      // Create a user-friendly error message
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to fetch users - check your network connection';
        
      set({ error: errorMessage, loading: false });
      toast.error(errorMessage);
    }
  },
  
  addUser: async (userData) => {
    set({ loading: true, error: null });
    
    try {
      console.log('usersStore: Adding user:', userData);
      const newUser = await createUser(userData);
      console.log('usersStore: User added:', newUser);
      
      // Update local state
      set((state) => ({ 
        users: [...state.users, newUser],
        loading: false,
        error: null
      }));
      
      // Refresh user list to ensure consistency
      await get().fetchUsers();
      
      return newUser;
    } catch (error) {
      console.error('UsersStore: Error adding user:', error);
      
      // Create a user-friendly error message
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to add user - check your network connection';
        
      set({ error: errorMessage, loading: false });
      toast.error(errorMessage);
      throw error;
    }
  },
  
  updateUser: async (id, updates) => {
    set({ loading: true, error: null });
    
    try {
      console.log('usersStore: Updating user:', id, updates);
      const updatedUser = await updateUser(id, updates);
      
      // Update local state
      set((state) => ({
        users: state.users.map((user) => user.id === id ? updatedUser : user),
        loading: false,
        error: null
      }));
      
      // Refresh user list to ensure consistency
      await get().fetchUsers();
      
      return updatedUser;
    } catch (error) {
      console.error('UsersStore: Error updating user:', error);
      
      // Create a user-friendly error message
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to update user - check your network connection';
        
      set({ error: errorMessage, loading: false });
      toast.error(errorMessage);
      throw error;
    }
  },

  deleteUser: async (id: string) => {
    set({ loading: true, error: null });
    
    try {
      console.log('usersStore: Deleting user:', id);
      await deleteUser(id);
      
      // Update local state
      set((state) => ({
        users: state.users.filter((user) => user.id !== id),
        loading: false,
        error: null
      }));
      
      // Refresh user list to ensure consistency
      await get().fetchUsers();
    } catch (error) {
      console.error('UsersStore: Error deleting user:', error);
      
      // Create a user-friendly error message
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to delete user - check your network connection';
        
      set({ error: errorMessage, loading: false });
      toast.error(errorMessage);
      throw error;
    }
  }
}));