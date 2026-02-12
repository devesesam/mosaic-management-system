import React, { createContext, useContext, useState, useEffect } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase, handleSupabaseError } from '../api/supabaseClient';
import { getWorkerByEmail, createOrUpdateWorkerProfile } from '../api/workersApi';
import { Worker } from '../types';
import toast from 'react-hot-toast';
import { logger } from '../utils/logger';

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
  isEditable: boolean;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

// List of email addresses that have edit permissions (loaded from environment)
const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS || '')
  .split(',')
  .map((e: string) => e.trim().toLowerCase())
  .filter(Boolean);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [currentWorker, setCurrentWorker] = useState<Worker | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isEditable, setIsEditable] = useState(false);

  // Check if user is an admin by querying the database
  const checkAdminStatus = async (email: string) => {
    try {
      // First check environment variable as fallback/override
      if (ADMIN_EMAILS.includes(email.toLowerCase())) {
        logger.debug('Auth: User is admin (via env var)');
        setIsEditable(true);
        return;
      }

      // Then check database
      const { data, error } = await supabase
        .from('admin_users')
        .select('email')
        .eq('email', email)
        .maybeSingle();

      if (error) {
        logger.error('Auth: Error checking admin status:', error);
        setIsEditable(false);
        return;
      }

      const isAdmin = !!data;
      setIsEditable(isAdmin);
      logger.debug('Auth: Admin status check:', { email, isAdmin });

    } catch (err) {
      logger.error('Auth: Unexpected error checking admin status:', err);
      setIsEditable(false);
    }
  };

  // Update isEditable when user changes
  useEffect(() => {
    if (user?.email) {
      checkAdminStatus(user.email);
    } else {
      setIsEditable(false);
    }
  }, [user]);

  // Reset all state and clear storage
  const handleSignOut = async () => {
    try {
      setSession(null);
      setUser(null);
      setCurrentWorker(null);
      setError(null);
      setAuthError(null);
      setIsEditable(false);
      localStorage.removeItem('supabase.auth.token');
      await supabase.auth.signOut();
    } catch (err) {
      logger.error('Error signing out:', err);
    }
  };

  // Helper function to handle worker profile logic
  const handleWorkerProfile = async (userEmail: string) => {
    const normalizedEmail = userEmail.toLowerCase();

    // Skip worker profile creation for admin emails
    if (ADMIN_EMAILS.includes(normalizedEmail)) {
      logger.debug('AuthProvider: Skipping worker profile creation for admin email:', normalizedEmail);
      return;
    }

    // For non-admin emails, try to get or create worker profile
    try {
      const worker = await getWorkerByEmail(userEmail);

      if (worker) {
        logger.debug('AuthProvider: Found existing worker profile');
        setCurrentWorker(worker);
      } else {
        logger.debug('AuthProvider: No worker profile found, creating one');
        const newWorker = await createOrUpdateWorkerProfile(userEmail);
        setCurrentWorker(newWorker);
      }
    } catch (err) {
      logger.error('AuthProvider: Error getting/creating worker profile:', err);
      // Don't throw here - allow auth to continue even if worker profile fails
    }
  };

  // Initialize auth and set up listener
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        logger.debug('AuthProvider: Initializing auth...');
        setLoading(true);

        // Get current session if any
        const { data } = await supabase.auth.getSession();
        logger.debug('Initial session check:', data.session ? 'Session exists' : 'No session');

        if (data.session) {
          setSession(data.session);
          setUser(data.session.user);

          // Handle worker profile for non-admin users
          if (data.session.user.email) {
            await handleWorkerProfile(data.session.user.email);
          }
        }
      } catch (err) {
        logger.error('AuthProvider: Error getting session:', err);
        setAuthError('Authentication service unavailable. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      logger.debug('AuthProvider: Auth state changed:', event);

      if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
        await handleSignOut();
      } else if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
        setSession(session);

        // Handle worker profile for non-admin users
        if (session.user.email) {
          await handleWorkerProfile(session.user.email);
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
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (signInError) {
        // Use less alarming console method for invalid credentials since it's expected user behavior
        if (signInError.message === 'Invalid login credentials' || signInError.message?.includes('invalid_credentials')) {
          logger.debug('AuthProvider: Invalid credentials provided');
        } else {
          logger.error('AuthProvider: Sign in error:', signInError);
        }
        setError('Invalid login credentials');
        setLoading(false);
        return false;
      }

      setLoading(false);
      return true;
    } catch (err) {
      logger.error('AuthProvider: Error signing in:', err);
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
        logger.error('AuthProvider: Sign up error:', signUpError);
        setError(signUpError.message);
      } else {
        logger.debug('AuthProvider: Sign up successful');
        setError('Account created. Please sign in.');
      }
    } catch (err) {
      logger.error('AuthProvider: Error signing up:', err);
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
    authError,
    isEditable
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