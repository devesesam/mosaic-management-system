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

  // Reset all state and clear storage
  const handleSignOut = async () => {
    try {
      setSession(null);
      setUser(null);
      setCurrentWorker(null);
      setError(null);
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
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          console.log('AuthProvider: Found existing session');
          setUser(session.user);
          setSession(session);
          // Run diagnostics on startup to check permissions
          await checkRLSPolicies();
          await runDatabaseDiagnostics(session.user.email || '');
        }
      } catch (err) {
        console.error('AuthProvider: Error getting session:', err);
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
        // Run diagnostics when user signs in
        await checkRLSPolicies();
        await runDatabaseDiagnostics(session.user.email || '');
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
    }
  }, [user]);

  const signIn = async (email: string, password: string): Promise<boolean> => {
    setError(null);
    setLoading(true);
    
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });
      
      if (signInError) {
        console.error('AuthProvider: Sign in error:', signInError);
        setError(signInError.message);
        return false;
      }
      
      console.log('AuthProvider: Sign in successful');
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