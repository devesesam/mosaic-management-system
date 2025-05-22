import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Worker } from '../types';
import { getCurrentWorker } from '../lib/supabase';

interface AuthContextProps {
  session: Session | null;
  user: User | null;
  currentWorker: Worker | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  error: string | null;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [currentWorker, setCurrentWorker] = useState<Worker | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      setCurrentWorker(null);
      setError(null);
      localStorage.clear();
    } catch (err) {
      console.error('Error signing out:', err);
      setError('Failed to sign out');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('AuthProvider: Initializing auth...');
    const initializeAuth = async () => {
      try {
        setLoading(true);
        console.log('AuthProvider: Fetching session...');
        
        // Check if Supabase URL and key are available
        if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
          console.error('AuthProvider: Missing Supabase credentials in environment variables');
          setError('Application configuration error. Please contact support.');
          setLoading(false);
          return;
        }

        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('AuthProvider: Error fetching session:', sessionError);
          setError('Failed to initialize authentication');
          setLoading(false);
          return;
        }
        
        console.log('AuthProvider: Session fetched:', !!currentSession);
        
        if (!currentSession) {
          console.log('AuthProvider: No active session found');
          setLoading(false);
          return;
        }

        const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
          console.error('AuthProvider: Error fetching user:', userError);
          setError('Failed to fetch user information');
          setLoading(false);
          return;
        }
        
        console.log('AuthProvider: User fetched:', !!currentUser);
        
        if (!currentUser) {
          console.log('AuthProvider: No user found in session');
          setLoading(false);
          return;
        }

        setSession(currentSession);
        setUser(currentUser);
        
        if (currentUser.email) {
          try {
            console.log('AuthProvider: Fetching worker for email:', currentUser.email);
            const worker = await getCurrentWorker(currentUser.email);
            console.log('AuthProvider: Worker found:', !!worker, worker);
            
            if (worker) {
              setCurrentWorker(worker);
            } else {
              console.warn('AuthProvider: No worker found for email:', currentUser.email);
              // Instead of auto sign-out, just leave as not associated with a worker
              // This prevents infinite loading when a user exists but isn't associated
            }
          } catch (workerErr) {
            console.error('AuthProvider: Error fetching worker:', workerErr);
            // Don't sign out on worker fetch error - might be temporary
          }
        }
      } catch (err) {
        console.error('AuthProvider: Auth initialization error:', err);
        setError('Failed to initialize authentication');
      } finally {
        console.log('AuthProvider: Auth initialization complete, setting loading to false');
        setLoading(false);
      }
    };

    initializeAuth().catch(err => {
      console.error('AuthProvider: Unhandled error in initializeAuth:', err);
      setError('An unexpected error occurred');
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('AuthProvider: Auth state changed:', event);
      
      if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
        await handleSignOut();
      } else if (session) {
        try {
          setSession(session);
          setUser(session.user);
          
          if (session.user.email) {
            try {
              console.log('AuthProvider: Fetching worker after auth state change for email:', session.user.email);
              const worker = await getCurrentWorker(session.user.email);
              console.log('AuthProvider: Worker found after auth state change:', !!worker);
              
              setCurrentWorker(worker);
              if (!worker) {
                console.warn('AuthProvider: No worker found for email after auth state change:', session.user.email);
              }
            } catch (workerErr) {
              console.error('AuthProvider: Error fetching worker after auth state change:', workerErr);
              // Don't set loading to false here as it might interfere with other operations
            }
          }
        } catch (err) {
          console.error('AuthProvider: Auth state change error:', err);
        } finally {
          setLoading(false);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setError(null);
    setLoading(true);
    
    try {
      console.log('AuthProvider: Attempting sign in for:', email);
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      
      if (signInError) {
        console.error('AuthProvider: Sign in error:', signInError);
        setError(signInError.message);
      } else {
        console.log('AuthProvider: Sign in successful');
      }
    } catch (err) {
      console.error('AuthProvider: Error signing in:', err);
      setError('Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string) => {
    setError(null);
    setLoading(true);
    
    try {
      console.log('AuthProvider: Attempting sign up for:', email);
      const { error: signUpError } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          emailRedirectTo: window.location.origin
        }
      });
      
      if (signUpError) {
        console.error('AuthProvider: Sign up error:', signUpError);
        setError(signUpError.message);
      } else {
        console.log('AuthProvider: Sign up successful');
        setError('Account created. Please sign in.');
      }
    } catch (err) {
      console.error('AuthProvider: Error signing up:', err);
      setError('Failed to sign up');
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await handleSignOut();
  };

  // Default to admin if worker exists but role is undefined
  const isAdmin = currentWorker ? (currentWorker.role !== 'viewer') : false;

  const value = {
    session,
    user,
    currentWorker,
    loading,
    signIn,
    signUp,
    signOut,
    error,
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