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
  const [loading, setLoading] = useState(false);  // Start with loading set to false
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

  useEffect(() => {
    console.log('AuthProvider: Setting up auth listener...');
    
    // Start with clean state - no loading screen
    handleSignOut();
    
    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('AuthProvider: Auth state changed:', event);

      if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
        await handleSignOut();
      } else if (session?.user?.email) {
        try {
          // Set user state
          setSession(session);
          setUser(session.user);
          
          // Check if we have a worker profile or need to create one
          let worker = await getCurrentWorker(session.user.email);
          
          if (!worker) {
            console.log('No worker found, creating profile automatically');
            try {
              worker = await createWorkerProfile(session.user.email);
            } catch (profileError) {
              console.error('Failed to create worker profile:', profileError);
              setError('Failed to set up your account. Please try again.');
              await handleSignOut();
              return;
            }
          }
          
          if (worker) {
            setCurrentWorker(worker);
          } else {
            // If we still don't have a worker, something went wrong
            setError('Unable to set up your account. Please contact support.');
            await handleSignOut();
          }
        } catch (err) {
          console.error('Error handling auth state change:', err);
          setError('Authentication error. Please try again.');
          await handleSignOut();
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
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      
      if (signInError) {
        console.error('AuthProvider: Sign in error:', signInError);
        setError(signInError.message);
        setLoading(false);
        return false;
      } else {
        console.log('AuthProvider: Sign in successful');
        return true;
      }
    } catch (err) {
      console.error('AuthProvider: Error signing in:', err);
      setError('Failed to sign in');
      setLoading(false);
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