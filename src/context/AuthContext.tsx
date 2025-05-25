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
  const [loading, setLoading] = useState(false); // Default to not loading
  const [error, setError] = useState<string | null>(null);

  // Reset all state and clear storage
  const handleSignOut = async () => {
    try {
      // First sign out from Supabase
      await supabase.auth.signOut();
      
      // Then clear all state
      setSession(null);
      setUser(null);
      setCurrentWorker(null);
      setError(null);

      // Forcefully remove any persistence
      localStorage.removeItem('supabase.auth.token');
      localStorage.removeItem('sb-cyffwuakzfhemrafjpwv-auth-token');
      
      // Log the signout
      console.log('AuthProvider: User signed out, state cleared');
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  // Check if there's an active session only when the component mounts
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        
        // If there's an active session, we'll handle it in the auth state change listener
        if (!data.session) {
          // No session, make sure we're not in a loading state
          setLoading(false);
        }
      } catch (error) {
        console.error('Error checking session:', error);
        setLoading(false);
      }
    };
    
    checkSession();
  }, []);

  useEffect(() => {
    console.log('AuthProvider: Setting up auth listener...');
    
    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('AuthProvider: Auth state changed:', event);

      if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
        await handleSignOut();
      } else if (event === 'SIGNED_IN' && session?.user?.email) {
        try {
          // Set user state
          setSession(session);
          setUser(session.user);
          setLoading(true);
          
          // Try to get existing worker profile
          try {
            let worker = await getCurrentWorker(session.user.email);
            
            // If no worker found, create one automatically
            if (!worker) {
              console.log('No worker found, creating profile automatically');
              worker = await createWorkerProfile(session.user.email);
            }
            
            if (worker) {
              setCurrentWorker(worker);
              setLoading(false);
            } else {
              // If we still don't have a worker, something went wrong
              setError('Unable to access your account. Please try again.');
              await handleSignOut();
            }
          } catch (error) {
            console.error('Error getting/creating worker profile:', error);
            setError('Authentication error. Please try again.');
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