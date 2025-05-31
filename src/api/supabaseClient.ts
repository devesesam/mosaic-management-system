import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate that we have the required environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  const errorMessage = 'CRITICAL ERROR: Missing Supabase credentials! Check your .env file.';
  console.error(errorMessage);
  throw new Error(errorMessage);
}

console.log('Initializing Supabase client with URL:', supabaseUrl);

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
  }
});

// Export a function to handle errors consistently
export const handleSupabaseError = (error: unknown): Error => {
  console.error('Supabase API error:', error);
  
  if (error instanceof Error) {
    return error;
  }
  
  return new Error('An unknown error occurred with the database');
};