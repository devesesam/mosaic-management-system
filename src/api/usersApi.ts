import { supabase, handleSupabaseError } from './supabaseClient';
import { User } from '../types';

/**
 * Get all users from the database
 */
export const getAllUsers = async (): Promise<User[]> => {
  try {
    console.log('UsersAPI: Fetching all users');
    
    // Log immediately before the actual Supabase call
    console.log('UsersAPI: CRITICAL - About to execute supabase.from("users").select()');
    console.time('UsersAPI: users query execution time');
    
    // Fetch users with detailed error handling
    const { data, error, status, statusText } = await supabase
      .from('users')
      .select('*')
      .order('name');
    
    console.timeEnd('UsersAPI: users query execution time');
    console.log('UsersAPI: CRITICAL - Supabase users query completed with status:', status, statusText);
    
    if (error) {
      console.error('UsersAPI: CRITICAL ERROR - Failed to fetch users:', error);
      console.log('UsersAPI: Error details:', JSON.stringify(error, null, 2));
      throw error;
    }
    
    console.log('UsersAPI: Users data received, count:', data?.length || 0);
    
    return data || [];
  } catch (error) {
    console.error('UsersAPI: CRITICAL - Exception during user fetching:', error);
    throw handleSupabaseError(error);
  }
};

/**
 * Create a new user
 */
export const createUser = async (userData: Omit<User, 'id' | 'created_at'>): Promise<User> => {
  try {
    console.log('UsersAPI: Creating user');
    
    console.log('UsersAPI: CRITICAL - About to insert new user');
    console.log('UsersAPI: User data:', JSON.stringify(userData, null, 2));
    
    const { data, error, status } = await supabase
      .from('users')
      .insert([userData])
      .select()
      .single();
    
    console.log('UsersAPI: User creation completed with status:', status);

    if (error) {
      console.error('UsersAPI: Error creating user:', error);
      console.log('UsersAPI: Error details:', JSON.stringify(error, null, 2));
      throw error;
    }

    console.log('UsersAPI: User created successfully:', data.id);
    return data;
  } catch (error) {
    console.error('UsersAPI: Exception during user creation:', error);
    throw handleSupabaseError(error);
  }
};

/**
 * Get a user by email
 */
export const getUserByEmail = async (email: string): Promise<User | null> => {
  try {
    console.log('UsersAPI: Fetching user by email:', email);
    
    console.log('UsersAPI: CRITICAL - About to query user by email');
    const { data, error, status } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();
    
    console.log('UsersAPI: User by email query completed with status:', status);
    
    if (error) {
      console.error('UsersAPI: Error fetching user by email:', error);
      console.log('UsersAPI: Error details:', JSON.stringify(error, null, 2));
      throw error;
    }
    
    if (data) {
      console.log('UsersAPI: User found:', data.id);
    } else {
      console.log('UsersAPI: No user found with email:', email);
    }
    
    return data;
  } catch (error) {
    console.error('UsersAPI: Exception fetching user by email:', error);
    throw handleSupabaseError(error);
  }
};

/**
 * Update an existing user
 */
export const updateUser = async (id: string, updates: Partial<User>): Promise<User> => {
  try {
    console.log('UsersAPI: Updating user:', id);
    
    console.log('UsersAPI: CRITICAL - About to update user');
    const { data, error, status } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    console.log('UsersAPI: User update completed with status:', status);

    if (error) {
      console.error('UsersAPI: Error updating user:', error);
      console.log('UsersAPI: Error details:', JSON.stringify(error, null, 2));
      throw error;
    }

    console.log('UsersAPI: User updated successfully:', id);
    return data;
  } catch (error) {
    console.error('UsersAPI: Exception during user update:', error);
    throw handleSupabaseError(error);
  }
};

/**
 * Delete a user
 */
export const deleteUser = async (id: string): Promise<void> => {
  try {
    console.log('UsersAPI: Deleting user:', id);
    
    console.log('UsersAPI: CRITICAL - About to delete user');
    const { error, status } = await supabase
      .from('users')
      .delete()
      .eq('id', id);
    
    console.log('UsersAPI: Delete user completed with status:', status);

    if (error) {
      console.error('UsersAPI: Error deleting user:', error);
      console.log('UsersAPI: Error details:', JSON.stringify(error, null, 2));
      throw error;
    }
    
    console.log('UsersAPI: User deleted successfully:', id);
  } catch (error) {
    console.error('UsersAPI: Exception during user deletion:', error);
    throw handleSupabaseError(error);
  }
};