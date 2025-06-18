import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate that we have the required environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  const errorMessage = 'CRITICAL ERROR: Missing Supabase credentials! Check your .env file.';
  console.error(errorMessage);
  console.error('VITE_SUPABASE_URL:', supabaseUrl ? 'SET' : 'MISSING');
  console.error('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'SET' : 'MISSING');
  throw new Error(errorMessage);
}

console.log('Initializing Supabase client with URL:', supabaseUrl);

// Create and export the Supabase client with more permissive settings
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false, // Disable session persistence for now
    autoRefreshToken: false, // Disable auto refresh
    detectSessionInUrl: false // Disable URL session detection
  },
  global: {
    headers: {
      'X-Client-Info': 'tasman-roofing-scheduler',
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  },
  db: {
    schema: 'public'
  }
});

// Test the connection immediately
async function testConnection() {
  try {
    console.log('Testing Supabase connection...');
    
    // Test basic connectivity
    const { data, error } = await supabase
      .from('workers')
      .select('count(*)')
      .limit(1);
    
    if (error) {
      console.error('Supabase connection test failed:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
    } else {
      console.log('Supabase connection test successful:', data);
    }
  } catch (err) {
    console.error('Supabase connection test exception:', err);
  }
}

// Run connection test after a short delay
setTimeout(testConnection, 1000);

// Export a function to handle errors consistently
export const handleSupabaseError = (error: unknown): Error => {
  console.error('Supabase API error:', error);
  
  if (error instanceof Error) {
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    return error;
  }
  
  return new Error('An unknown error occurred with the database');
};