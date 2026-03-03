import React, { createContext, useContext, useState, useEffect } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase, handleSupabaseError } from '../api/supabaseClient';
import { TeamMember } from '../types';
import toast from 'react-hot-toast';
import { logger } from '../utils/logger';

// Direct API call to fetch team members (used during auth initialization)
async function fetchTeamMembersApi(): Promise<TeamMember[]> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const apiUrl = `${supabaseUrl}/functions/v1/get-workers`;

  const response = await fetch(apiUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  if (data.success && data.data) {
    return data.data;
  }
  throw new Error(data.error || 'Failed to fetch team members');
}

interface AuthContextProps {
  session: Session | null;
  user: User | null;
  currentTeamMember: TeamMember | null;
  // Backwards compatibility alias
  currentWorker: TeamMember | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (email: string, password: string, name?: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshCurrentTeamMember: () => Promise<void>;
  error: string | null;
  setError: (error: string | null) => void;
  isAdmin: boolean;
  authError: string | null;
  isEditable: boolean;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [currentTeamMember, setCurrentTeamMember] = useState<TeamMember | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  // All authenticated users have full edit access
  const isEditable = !!user;

  // Reset all state and clear storage
  const handleSignOut = async () => {
    try {
      setSession(null);
      setUser(null);
      setCurrentTeamMember(null);
      setError(null);
      setAuthError(null);
      localStorage.removeItem('supabase.auth.token');
      await supabase.auth.signOut();
    } catch (err) {
      logger.error('Error signing out:', err);
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

          // Try to link team member profile
          if (data.session.user.email) {
            const email = data.session.user.email.toLowerCase();
            try {
              const teamMembers = await fetchTeamMembersApi();
              const member = teamMembers.find(m => m.email?.toLowerCase() === email);

              if (member) {
                logger.debug('AuthProvider: Linked to team member profile:', member.id);
                setCurrentTeamMember(member);
              } else {
                logger.debug('AuthProvider: No team member profile found for user:', email);
              }
            } catch (err) {
              logger.error('AuthProvider: Failed to link team member profile:', err);
            }
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

        // Try to link team member profile
        const email = session.user.email?.toLowerCase();
        if (email) {
          try {
            const teamMembers = await fetchTeamMembersApi();
            const member = teamMembers.find(m => m.email?.toLowerCase() === email);

            if (member) {
              logger.debug('AuthState: Linked to team member profile:', member.id);
              setCurrentTeamMember(member);
            } else {
              logger.debug('AuthState: No team member profile found for user:', email);
            }
          } catch (err) {
            logger.error('AuthState: Failed to link team member profile:', err);
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

  const signUp = async (email: string, password: string, name?: string) => {
    setError(null);
    setLoading(true);

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: name ? { name } : undefined
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

  const refreshCurrentTeamMember = async () => {
    if (!user?.email) return;

    try {
      const teamMembers = await fetchTeamMembersApi();
      const email = user.email.toLowerCase();
      const member = teamMembers.find(m => m.email?.toLowerCase() === email);

      if (member) {
        logger.debug('AuthProvider: Refreshed team member profile:', member.id);
        setCurrentTeamMember(member);
      }
    } catch (err) {
      logger.error('AuthProvider: Failed to refresh team member profile:', err);
    }
  };

  const signOut = async () => {
    await handleSignOut();
  };

  const isAdmin = true;

  const value = {
    session,
    user,
    currentTeamMember,
    currentWorker: currentTeamMember, // Backwards compatibility alias
    loading,
    signIn,
    signUp,
    signOut,
    refreshCurrentTeamMember,
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