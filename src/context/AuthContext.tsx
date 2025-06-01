import React, { createContext, useContext, useState, useEffect } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase, handleSupabaseError } from '../api/supabaseClient';
import { getWorkerByEmail, createOrUpdateWorkerProfile } from '../api/workersApi';
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
  const [loading, setLoading] = useState(false);
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
        
        // Get current session if any
        const { data } = await supabase.auth.getSession();
        console.log('Initial session check:', data.session ? 'Session exists' : 'No session');
        
        if (data.session) {
          setSession(data.session);
          setUser(data.session.user);
          
          // Try to get worker profile for this user
          if (data.session.user.email) {
            try {
              const worker = await getWorkerByEmail(data.session.user.email);
              
              if (worker) {
                console.log('Found existing worker profile');
                setCurrentWorker(worker);
              } else {
                console.log('No worker profile found, creating one');
                const newWorker = await createOrUpdateWorkerProfile(data.session.user.email);
                setCurrentWorker(newWorker);
              }
            } catch (err) {
              console.error('Error getting/creating worker profile:', err);
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
        
        // Initialize worker profile
        if (session.user.email) {
          try {
            const worker = await getWorkerByEmail(session.user.email);
            
            if (worker) {
              setCurrentWorker(worker);
            } else {
              const newWorker = await createOrUpdateWorkerProfile(session.user.email);
              setCurrentWorker(newWorker);
            }
          } catch (err) {
            console.error('Error fetching worker profile:', err);
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
      
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });
      
      if (signInError) {
        console.error('AuthProvider: Sign in error:', signInError);
        setError('Invalid login credentials');
        setLoading(false);
        return false;
      }
      
      console.log('AuthProvider: Sign in successful');
      setLoading(false);
      return true;
    } catch (err) {
      console.error('AuthProvider: Error signing in:', err);
      setError('Failed to sign in. Please try again.');
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