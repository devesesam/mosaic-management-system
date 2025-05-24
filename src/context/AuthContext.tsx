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

  // Function to create a worker record for a user if one doesn't exist
  const createWorkerForUser = async (user: User) => {
    if (!user.email) {
      console.error('AuthProvider: Cannot create worker record - user has no email');
      return null;
    }

    try {
      console.log('AuthProvider: Creating worker record for user:', user.email);
      
      const { data, error } = await supabase
        .from('workers')
        .insert([
          { 
            name: user.email.split('@')[0], // Use part of email as name
            email: user.email,
            role: 'admin' // Default to admin role
          }
        ])
        .select()
        .single();
      
      if (error) {
        console.error('AuthProvider: Error creating worker record:', error);
        return null;
      }
      
      console.log('AuthProvider: Worker record created successfully:', data);
      return data;
    } catch (err) {
      console.error('AuthProvider: Error in createWorkerForUser:', err);
      return null;
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
            let worker = await getCurrentWorker(currentUser.email);
            console.log('AuthProvider: Worker found:', !!worker, worker);
            
            if (!worker) {
              console.warn('AuthProvider: No worker found for email:', currentUser.email);
              // Try to create a worker record for this user
              worker = await createWorkerForUser(currentUser);
              if (worker) {
                console.log('AuthProvider: Created new worker record for user');
              } else {
                console.error('AuthProvider: Failed to create worker record for user');
              }
            }
            
            setCurrentWorker(worker);
          } catch (workerErr) {
            console.error('AuthProvider: Error fetching/creating worker:', workerErr);
          } finally {
            // Make sure we set loading to false even if worker fetch fails
            setLoading(false);
          }
        } else {
          // Make sure to set loading to false if no email
          setLoading(false);
        }
      } catch (err) {
        console.error('AuthProvider: Auth initialization error:', err);
        setError('Failed to initialize authentication');
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
              let worker = await getCurrentWorker(session.user.email);
              console.log('AuthProvider: Worker found after auth state change:', !!worker);
              
              if (!worker) {
                console.warn('AuthProvider: No worker found for email after auth state change:', session.user.email);
                // Try to create a worker record for this user
                worker = await createWorkerForUser(session.user);
                if (worker) {
                  console.log('AuthProvider: Created new worker record for user after auth state change');
                } else {
                  console.error('AuthProvider: Failed to create worker record for user after auth state change');
                }
              }
              
              setCurrentWorker(worker);
            } catch (workerErr) {
              console.error('AuthProvider: Error fetching/creating worker after auth state change:', workerErr);
            } finally {
              // Make sure we set loading to false even if worker fetch fails
              setLoading(false);
            }
          } else {
            // Make sure to set loading to false if no email
            setLoading(false);
          }
        } catch (err) {
          console.error('AuthProvider: Auth state change error:', err);
          setLoading(false);
        }
      } else {
        // If no session in auth state change, make sure loading is false
        setLoading(false);
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
        setLoading(false);
      } else {
        console.log('AuthProvider: Sign in successful');
        // Loading will be set to false by the auth state change handler
      }
    } catch (err) {
      console.error('AuthProvider: Error signing in:', err);
      setError('Failed to sign in');
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