import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate that we have the required environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials! Check your environment variables.');
}

// Create and export the Supabase client
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  },
  global: {
    headers: {
      'X-Client-Info': 'tasman-roofing-scheduler'
    }
  },
  db: {
    schema: 'public'
  }
});

// Helper function to check if Supabase is initialized
export const isSupabaseInitialized = () => {
  return Boolean(supabaseUrl && supabaseAnonKey);
};

// Export a function to handle errors consistently
export const handleSupabaseError = (error: unknown): Error => {
  console.error('Supabase API error:', error);
  
  if (error instanceof Error) {
    return error;
  }
  
  return new Error('An unknown error occurred with the database');
};