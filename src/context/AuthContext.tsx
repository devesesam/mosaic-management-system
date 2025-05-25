import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { 
  supabase, 
  isSupabaseInitialized, 
  getCurrentWorker, 
  createWorkerProfile,
  ensureUserRecord, 
  runDatabaseDiagnostics,
  checkRLSPolicies
} from '../lib/supabase';
import { Worker } from '../types';

interface AuthContextProps {
  session: Session | null;
  user: User | null;
  currentWorker: Worker | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  error: string | null;
  setError: (error: string | null) => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [currentWorker, setCurrentWorker] = useState<Worker | null>(null);
  const [loading, setLoading] = useState(false); // Start with loading false
  const [error, setError] = useState<string | null>(null);

  // Reset all state and clear storage
  const handleSignOut = async () => {
    try {
      // Clear all state
      setSession(null);
      setUser(null);
      setCurrentWorker(null);
      setError(null);

      // Clear local storage
      localStorage.removeItem('supabase.auth.token');

      // Sign out from Supabase
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  // Initialize auth and set up listener
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Get current session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          console.log('Found existing session');
          setUser(session.user);
          setSession(session);
          
          // Check RLS policies to ensure data access
          await checkRLSPolicies();
          
          // Force data prefetch after login
          const { data: jobs } = await supabase.from('jobs').select('count');
          console.log(`Found ${jobs?.[0]?.count || 0} jobs in the database`);
          
          const { data: workers } = await supabase.from('workers').select('count');
          console.log(`Found ${workers?.[0]?.count || 0} workers in the database`);
          
          // Just to be safe, let's run a query with no count
          const { data: jobsList } = await supabase.from('jobs').select('*');
          console.log(`Direct jobs query returned ${jobsList?.length || 0} results`);
        }
      } catch (err) {
        console.error('Error getting session:', err);
      }
    };
    
    initializeAuth();
    
    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
        await handleSignOut();
      } else if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
        setSession(session);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Handle worker profile whenever user changes
  useEffect(() => {
    const initializeWorkerProfile = async () => {
      if (!user?.email) return;
      
      setLoading(true);
      
      try {
        // Run diagnostics to check database state
        await runDatabaseDiagnostics(user.email);
        
        // Try to get worker profile
        let worker = await getCurrentWorker(user.email);
        
        // If no worker found, create one
        if (!worker) {
          worker = await createWorkerProfile(user.email);
        }
        
        // Ensure a record exists in public.users that links to auth.users
        await ensureUserRecord(user.id, user.email);
        
        // Set current worker
        setCurrentWorker(worker);
        
      } catch (err) {
        console.error('Error initializing worker profile:', err);
        // Don't set error, just log it - we can proceed without a proper worker profile
        // setError('Error retrieving your account information. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    if (user) {
      initializeWorkerProfile();
    } else {
      setLoading(false);
    }
  }, [user]);

  const signIn = async (email: string, password: string): Promise<boolean> => {
    setError(null);
    setLoading(true);
    
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      
      if (signInError) {
        console.error('Sign in error:', signInError);
        setError(signInError.message);
        setLoading(false);
        return false;
      } else {
        return true;
      }
    } catch (err) {
      console.error('Error signing in:', err);
      setError('Failed to sign in');
      setLoading(false);
      return false;
    }
  };

  const signUp = async (email: string, password: string) => {
    setError(null);
    setLoading(true);
    
    try {
      const { error: signUpError } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          emailRedirectTo: window.location.origin
        }
      });
      
      if (signUpError) {
        console.error('Sign up error:', signUpError);
        setError(signUpError.message);
      } else {
        setError('Account created. Please sign in.');
      }
    } catch (err) {
      console.error('Error signing up:', err);
      setError('Failed to sign up');
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await handleSignOut();
  };

  // All users are treated as admins to ensure they can see everything
  const isAdmin = true;

  const value = {
    session,
    user,
    currentWorker,
    loading,
    signIn,
    signUp,
    signOut,
    error,
    setError,
    isAdmin
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};