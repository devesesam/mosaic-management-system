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
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [currentWorker, setCurrentWorker] = useState<Worker | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authInitialized, setAuthInitialized] = useState(false);

  // Reset all state and clear storage
  const handleSignOut = async () => {
    try {
      console.log('AuthProvider: Signing out user');
      // Clear all state first
      setSession(null);
      setUser(null);
      setCurrentWorker(null);
      setError(null);
      
      // Clear local storage and session storage
      localStorage.removeItem('supabase.auth.token');
      sessionStorage.removeItem('supabase.auth.token');
      
      // Call Supabase signOut
      await supabase.auth.signOut();
      
      console.log('AuthProvider: Sign out complete');
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  // Initialize auth and set up listener
  useEffect(() => {
    const initializeAuth = async () => {
      if (authInitialized) return;
      
      console.log('AuthProvider: Initializing auth');
      setLoading(true);
      
      try {
        // Check for existing session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          console.log('AuthProvider: Found existing session for', session.user.email);
          setUser(session.user);
          setSession(session);
          
          // Run diagnostics on startup to check permissions
          await checkRLSPolicies();
          await runDatabaseDiagnostics(session.user.email || '');
        } else {
          console.log('AuthProvider: No existing session found');
          // Make sure state is cleared
          setUser(null);
          setSession(null);
          setCurrentWorker(null);
        }
      } catch (err) {
        console.error('AuthProvider: Error getting session:', err);
        // Ensure state is cleared in case of error
        setUser(null);
        setSession(null);
        setCurrentWorker(null);
      } finally {
        setLoading(false);
        setAuthInitialized(true);
      }
    };
    
    initializeAuth();
    
    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('AuthProvider: Auth state changed:', event);

      if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
        console.log('AuthProvider: User signed out or deleted');
        await handleSignOut();
      } else if (event === 'SIGNED_IN' && session?.user) {
        console.log('AuthProvider: User signed in:', session.user.email);
        setUser(session.user);
        setSession(session);
        
        // Run diagnostics when user signs in
        await checkRLSPolicies();
        await runDatabaseDiagnostics(session.user.email || '');
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        console.log('AuthProvider: Token refreshed for', session.user.email);
        setUser(session.user);
        setSession(session);
      }
    });

    return () => {
      console.log('AuthProvider: Cleaning up auth subscription');
      subscription.unsubscribe();
    };
  }, [authInitialized]);

  // Handle worker profile whenever user changes
  useEffect(() => {
    const initializeWorkerProfile = async () => {
      if (!user?.email) return;
      
      console.log('AuthProvider: Initializing worker profile for', user.email);
      setLoading(true);
      
      try {
        await runDatabaseDiagnostics(user.email);
        
        // Try to get worker profile
        let worker = await getCurrentWorker(user.email);
        
        // If no worker found, create one
        if (!worker) {
          console.log('AuthProvider: No worker profile found, creating one...');
          worker = await createWorkerProfile(user.email);
          console.log('Worker profile created:', worker);
          
          // If still no worker, something is really wrong
          if (!worker) {
            console.error('AuthProvider: Failed to create worker profile');
            setError('Failed to create your worker profile. Please contact support.');
            setLoading(false);
            return;
          }
        }
        
        // Ensure user record exists
        await ensureUserRecord(user.id, user.email);
        
        setCurrentWorker(worker);
        setError(null);
      } catch (err) {
        console.error('AuthProvider: Error initializing worker profile:', err);
        setError('Error retrieving your account information. Please try again.');
        setCurrentWorker(null);
      } finally {
        setLoading(false);
      }
    };
    
    if (user) {
      initializeWorkerProfile();
    } else {
      // Clear worker profile when user is not set
      setCurrentWorker(null);
    }
  }, [user]);

  const signIn = async (email: string, password: string): Promise<boolean> => {
    setError(null);
    setLoading(true);
    
    try {
      console.log('AuthProvider: Attempting sign in for', email);
      
      // Clear existing state first
      setUser(null);
      setSession(null);
      setCurrentWorker(null);
      
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });
      
      if (signInError) {
        console.error('AuthProvider: Sign in error:', signInError);
        setError(signInError.message);
        return false;
      }
      
      if (!data.user || !data.session) {
        console.error('AuthProvider: Sign in succeeded but no user/session returned');
        setError('Authentication failed. Please try again.');
        return false;
      }
      
      console.log('AuthProvider: Sign in successful for', email);
      setUser(data.user);
      setSession(data.session);
      return true;
    } catch (err) {
      console.error('AuthProvider: Error signing in:', err);
      setError('Failed to sign in');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string) => {
    setError(null);
    setLoading(true);
    
    try {
      console.log('AuthProvider: Attempting sign up for', email);
      
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
        console.log('AuthProvider: Sign up successful for', email);
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