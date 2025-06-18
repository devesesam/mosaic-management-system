import { supabase } from './supabaseClient';
import { Worker } from '../types';

/**
 * Get all workers from the database
 */
export const getAllWorkers = async (): Promise<Worker[]> => {
  const { data, error } = await supabase
    .from('workers')
    .select('*')
    .order('name');
  
  if (error) {
    console.error('Failed to fetch workers:', error);
    throw new Error(`Failed to fetch workers: ${error.message}`);
  }
  
  return data || [];
};

/**
 * Create a new worker
 */
export const createWorker = async (workerData: Omit<Worker, 'id' | 'created_at'>): Promise<Worker> => {
  const { data, error } = await supabase
    .from('workers')
    .insert([{ ...workerData, role: 'admin' }])
    .select()
    .single();
  
  if (error) {
    console.error('Failed to create worker:', error);
    throw new Error(`Failed to create worker: ${error.message}`);
  }
  
  return data;
};

/**
 * Delete a worker
 */
export const deleteWorker = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('workers')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Failed to delete worker:', error);
    throw new Error(`Failed to delete worker: ${error.message}`);
  }
};

/**
 * Get a worker by email
 */
export const getWorkerByEmail = async (email: string): Promise<Worker | null> => {
  const { data, error } = await supabase
    .from('workers')
    .select('*')
    .eq('email', email)
    .maybeSingle();
  
  if (error) {
    console.error('Failed to fetch worker by email:', error);
    throw new Error(`Failed to fetch worker: ${error.message}`);
  }
  
  return data;
};

/**
 * Create or update a worker profile for a user
 */
export const createOrUpdateWorkerProfile = async (email: string, name?: string): Promise<Worker> => {
  const workerData = {
    name: name || email.split('@')[0],
    email: email,
    role: 'admin' as const
  };
  
  const { data, error } = await supabase
    .from('workers')
    .upsert(workerData, { 
      onConflict: 'email',
      ignoreDuplicates: false
    })
    .select()
    .single();
  
  if (error) {
    console.error('Failed to create/update worker profile:', error);
    throw new Error(`Failed to create/update worker: ${error.message}`);
  }
  
  return data;
};