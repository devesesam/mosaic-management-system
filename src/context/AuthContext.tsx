import React, { createContext, useContext, useState, useEffect } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase, getCurrentWorker, createWorkerProfile, ensureUserRecord } from '../lib/supabase';
import { Worker } from '../types';
import toast from 'react-hot-toast';

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
  authError: string | null;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [currentWorker, setCurrentWorker] = useState<Worker | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  // Reset all state and clear storage
  const handleSignOut = async () => {
    try {
      setSession(null);
      setUser(null);
      setCurrentWorker(null);
      setError(null);
      setAuthError(null);
      localStorage.removeItem('supabase.auth.token');
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  // Initialize auth and set up listener
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        console.log('AuthProvider: Initializing auth...');
        setLoading(true);
        
        // Add timeout to prevent hanging
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Authentication timeout')), 60000); // Increased from 30000 to 60000 (60 seconds)
        });
        
        const { data } = await Promise.race([
          sessionPromise,
          timeoutPromise.then(() => {
            throw new Error('Authentication timeout');
          })
        ]) as any;
        
        const session = data.session;
        
        if (session?.user) {
          console.log('AuthProvider: Found existing session');
          setUser(session.user);
          setSession(session);
          
          // Try to get or create worker profile for this user
          if (session.user.email) {
            try {
              console.log('AuthProvider: Getting worker profile for', session.user.email);
              // Add timeout for worker profile fetch
              const workerPromise = getCurrentWorker(session.user.email);
              const workerTimeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Worker profile fetch timeout')), 60000); // Increased from 30000 to 60000 (60 seconds)
              });
              
              const worker = await Promise.race([
                workerPromise, 
                workerTimeoutPromise.then(() => {
                  throw new Error('Worker profile fetch timeout');
                })
              ]) as any;
              
              if (worker) {
                console.log('AuthProvider: Found worker profile:', worker);
                setCurrentWorker(worker);
              } else {
                console.log('AuthProvider: No worker profile found, explicitly creating one');
                const newWorker = await createWorkerProfile(session.user.email);
                console.log('AuthProvider: Created worker profile:', newWorker);
                setCurrentWorker(newWorker);
              }
              
              // Also ensure user record exists
              await ensureUserRecord(session.user.id, session.user.email);
            } catch (err) {
              console.error('Error getting/creating worker profile:', err);
              // Don't fail the auth process if worker profile fails
            }
          }
        }
      } catch (err) {
        console.error('AuthProvider: Error getting session:', err);
        setAuthError('Authentication service unavailable. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    initializeAuth();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('AuthProvider: Auth state changed:', event);

      if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
        await handleSignOut();
      } else if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
        setSession(session);
        
        // Initialize worker profile in background
        if (session.user.email) {
          try {
            console.log('AuthProvider: Getting worker profile for', session.user.email);
            const worker = await getCurrentWorker(session.user.email);
            
            if (worker) {
              console.log('AuthProvider: Found worker profile:', worker);
              setCurrentWorker(worker);
            } else {
              console.log('AuthProvider: No worker profile found, creating one');
              const newWorker = await createWorkerProfile(session.user.email);
              console.log('AuthProvider: Created worker profile:', newWorker);
              setCurrentWorker(newWorker);
            }
            
            // Also ensure user record exists
            await ensureUserRecord(session.user.id, session.user.email);
          } catch (err) {
            console.error('Error fetching worker profile:', err);
            // Don't break auth flow on worker profile error
          }
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string): Promise<boolean> => {
    setError(null);
    setLoading(true);
    
    try {
      console.log('AuthProvider: Attempting sign in for:', email);
      
      // Add timeout for sign in
      const signInPromise = supabase.auth.signInWithPassword({ email, password });
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Sign in timeout')), 60000); // Increased from 30000 to 60000 (60 seconds)
      });
      
      const { data, error: signInError } = await Promise.race([
        signInPromise,
        timeoutPromise.then(() => {
          throw new Error('Sign in timeout');
        })
      ]) as any;
      
      if (signInError) {
        console.error('AuthProvider: Sign in error:', signInError);
        setError(signInError.message);
        setLoading(false);
        return false;
      }
      
      console.log('AuthProvider: Sign in successful');
      
      // Try to initialize worker profile right away
      if (data?.user?.email) {
        try {
          console.log('AuthProvider: Fetching worker profile after sign in');
          // We'll let the auth state change listener handle this
          // for consistency and to avoid race conditions
        } catch (err) {
          console.error('Error initializing worker profile:', err);
        }
      }
      
      setLoading(false);
      return true;
    } catch (err) {
      console.error('AuthProvider: Error signing in:', err);
      setError(err instanceof Error ? err.message : 'Failed to sign in');
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
    isAdmin,
    authError
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