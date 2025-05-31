import { supabase, handleSupabaseError } from './supabaseClient';
import { Worker } from '../types';

/**
 * Get all workers from the database
 * No authentication required - using public access RLS policies
 */
export const getAllWorkers = async (): Promise<Worker[]> => {
  try {
    console.log('WorkersAPI: Fetching all workers');
    
    // Simple query with no auth required
    const { data, error } = await supabase
      .from('workers')
      .select('*')
      .order('name');
    
    if (error) {
      throw error;
    }
    
    console.log(`WorkersAPI: Successfully fetched ${data?.length || 0} workers`);
    return data || [];
  } catch (error) {
    throw handleSupabaseError(error);
  }
};

/**
 * Create a new worker
 */
export const createWorker = async (workerData: Omit<Worker, 'id' | 'created_at'>): Promise<Worker> => {
  try {
    console.log('WorkersAPI: Creating worker');
    
    // Make sure role is set to admin (application requirement)
    const workerWithRole = {
      ...workerData,
      role: 'admin'
    };
    
    const { data, error } = await supabase
      .from('workers')
      .insert([workerWithRole])
      .select()
      .single();

    if (error) {
      throw error;
    }

    console.log('WorkersAPI: Worker created successfully:', data.id);
    return data;
  } catch (error) {
    throw handleSupabaseError(error);
  }
};

/**
 * Delete a worker and handle any assigned jobs
 */
export const deleteWorker = async (id: string): Promise<void> => {
  try {
    console.log('WorkersAPI: Deleting worker:', id);
    
    // First update any jobs assigned to this worker
    const { error: jobsError } = await supabase
      .from('jobs')
      .update({ worker_id: null })
      .eq('worker_id', id);
      
    if (jobsError) {
      console.error('WorkersAPI: Error unassigning jobs:', jobsError);
      // Continue despite error
    }
    
    // Delete secondary worker assignments
    const { error: secondaryError } = await supabase
      .from('job_secondary_workers')
      .delete()
      .eq('worker_id', id);
      
    if (secondaryError) {
      console.error('WorkersAPI: Error deleting secondary assignments:', secondaryError);
      // Continue despite error
    }
    
    // Finally delete the worker
    const { error } = await supabase
      .from('workers')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    console.log('WorkersAPI: Worker deleted successfully:', id);
  } catch (error) {
    throw handleSupabaseError(error);
  }
};

/**
 * Get a worker by email
 */
export const getWorkerByEmail = async (email: string): Promise<Worker | null> => {
  try {
    console.log('WorkersAPI: Fetching worker by email:', email);
    
    const { data, error } = await supabase
      .from('workers')
      .select('*')
      .eq('email', email)
      .maybeSingle();
    
    if (error) {
      throw error;
    }
    
    if (data) {
      console.log('WorkersAPI: Worker found:', data.id);
    } else {
      console.log('WorkersAPI: No worker found with email:', email);
    }
    
    return data;
  } catch (error) {
    throw handleSupabaseError(error);
  }
};

/**
 * Create or update a worker profile for a user
 */
export const createOrUpdateWorkerProfile = async (email: string, name?: string): Promise<Worker> => {
  try {
    console.log(`WorkersAPI: Creating/updating worker profile for ${email}`);
    
    const { data, error } = await supabase
      .from('workers')
      .upsert(
        {
          name: name || email.split('@')[0],
          email: email,
          role: 'admin'
        },
        { 
          onConflict: 'email',
          ignoreDuplicates: false
        }
      )
      .select()
      .single();
      
    if (error) {
      throw error;
    }
    
    console.log('WorkersAPI: Worker profile created/updated:', data.id);
    return data;
  } catch (error) {
    throw handleSupabaseError(error);
  }
};