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

// Create and export the Supabase client with optimal settings for this use case
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  },
  global: {
    headers: {
      'X-Client-Info': 'mosaic-scheduler',
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  },
  db: {
    schema: 'public'
  },
  realtime: {
    params: {
      eventsPerSecond: 2
    }
  }
});

// Test connection function using the dedicated test function
export async function testSupabaseConnection(): Promise<boolean> {
  try {
    console.log('Testing Supabase connection...');
    
    // Use the dedicated test function we created in the migration
    const { data, error } = await supabase.rpc('test_connection');
    
    // DETAILED LOGGING - Log the raw connection test response
    console.log('Supabase connection test - RAW RESPONSE:', {
      data: data,
      error: error,
      dataType: typeof data,
      errorDetails: error ? {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      } : 'no error'
    });
    
    if (error) {
      console.error('Supabase connection test failed:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      return false;
    } else {
      console.log('Supabase connection test successful:', data);
      return true;
    }
  } catch (err) {
    console.error('Supabase connection test exception:', err);
    return false;
  }
}

// Run connection test after initialization
let connectionTested = false;
export async function ensureConnection(): Promise<void> {
  if (!connectionTested) {
    connectionTested = true;
    console.log('SupabaseClient: Running initial connection test...');
    const isConnected = await testSupabaseConnection();
    if (!isConnected) {
      console.warn('Supabase connection test failed - but continuing anyway');
    } else {
      console.log('SupabaseClient: Initial connection test passed');
    }
  }
}

// Auto-test connection after a short delay
setTimeout(() => {
  ensureConnection();
}, 500);

// Export a function to handle errors consistently
export const handleSupabaseError = (error: unknown): Error => {
  console.error('Supabase API error:', error);
  
  if (error && typeof error === 'object' && 'message' in error) {
    const supabaseError = error as any;
    console.error('Error details:', {
      message: supabaseError.message,
      code: supabaseError.code,
      details: supabaseError.details,
      hint: supabaseError.hint
    });
    
    return new Error(supabaseError.message || 'Database error');
  }
  
  if (error instanceof Error) {
    return error;
  }
  
  return new Error('An unknown error occurred with the database');
};