import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseInitialized, getCurrentWorker, createWorkerProfile } from '../lib/supabase';
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
  const [loading, setLoading] = useState(true);
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
      localStorage.clear();

      // Sign out from Supabase
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Error signing out:', err);
      setError('Failed to sign out');
    }
  };

  // Function to ensure a worker profile exists for the current user
  const ensureWorkerProfile = async (userEmail: string): Promise<Worker | null> => {
    if (!userEmail) {
      console.error('Cannot create worker record - email is missing');
      return null;
    }

    try {
      console.log('Ensuring worker profile exists for:', userEmail);
      
      // First, try to get the existing worker
      let worker = await getCurrentWorker(userEmail);
      
      // If no worker found, create one
      if (!worker) {
        console.log('No worker profile found, creating one...');
        try {
          worker = await createWorkerProfile(userEmail);
          console.log('Worker profile created successfully:', worker);
        } catch (createError) {
          console.error('Failed to create worker profile:', createError);
          throw new Error('Could not create worker profile');
        }
      }
      
      return worker;
    } catch (error) {
      console.error('Error ensuring worker profile:', error);
      return null;
    }
  };

  useEffect(() => {
    console.log('AuthProvider: Initializing auth...');
    let isActive = true;
    let authTimeout: NodeJS.Timeout;
    
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          setSession(session);
          setUser(session.user);
          
          if (session.user.email) {
            try {
              console.log('Found existing session, ensuring worker profile...');
              const worker = await ensureWorkerProfile(session.user.email);
              
              if (worker) {
                console.log('Worker profile confirmed:', worker);
                setCurrentWorker(worker);
              } else {
                console.error('Failed to ensure worker profile exists');
                setError('Could not set up your worker profile. Please try again.');
              }
            } catch (workerErr) {
              console.error('Error getting worker profile:', workerErr);
              setError('Failed to load your profile. Please refresh and try again.');
            }
          }
        }
      } catch (err) {
        console.error('Error initializing auth:', err);
        setError('Failed to initialize authentication');
      } finally {
        if (isActive) setLoading(false);
      }
    };

    initializeAuth();

    // Set a timeout to prevent infinite loading
    authTimeout = setTimeout(() => {
      if (isActive && loading) {
        console.warn('AuthProvider: Auth initialization timed out');
        setLoading(false);
        setError('Authentication timed out. Please refresh the page.');
      }
    }, 10000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('AuthProvider: Auth state changed:', event);

      if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
        await handleSignOut();
      } else if (session?.user?.email) {
        try {
          setSession(session);
          setUser(session.user);
          
          console.log('Auth state change, ensuring worker profile...');
          const worker = await ensureWorkerProfile(session.user.email);
          
          if (isActive) {
            setCurrentWorker(worker);
          }
        } catch (err) {
          console.error('Error in auth state change:', err);
          setError('Failed to verify user permissions');
        } finally {
          if (isActive) setLoading(false);
        }
      }
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
      clearTimeout(authTimeout);
    };
  }, []);

  const signIn = async (email: string, password: string): Promise<boolean> => {
    setError(null);
    setLoading(true);
    
    try {
      console.log('AuthProvider: Attempting sign in for:', email);
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      
      if (signInError) {
        setLoading(false);
        console.error('AuthProvider: Sign in error:', signInError);
        setError(signInError.message);
        return false;
      } else {
        console.log('AuthProvider: Sign in successful');
        return true;
      }
    } catch (err) {
      setLoading(false);
      console.error('AuthProvider: Error signing in:', err);
      setError('Failed to sign in');
      return false;
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