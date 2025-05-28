import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { 
  supabase, 
  isSupabaseInitialized,
  checkRLSPolicies
} from '../lib/supabase';
import toast from 'react-hot-toast';

interface AuthContextProps {
  session: Session | null;
  user: User | null;
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Clear all auth-related state and storage
  const handleSignOut = async () => {
    try {
      console.log('AuthProvider: Starting sign out process');
      
      // First clear all state
      setSession(null);
      setUser(null);
      setError(null);
      
      // Clear local storage and session storage for any auth-related items
      localStorage.removeItem('supabase.auth.token');
      sessionStorage.removeItem('supabase.auth.token');
      
      // Additional cleanup for any other auth-related items
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('supabase.auth.')) {
          localStorage.removeItem(key);
        }
      });
      
      Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith('supabase.auth.')) {
          sessionStorage.removeItem(key);
        }
      });
      
      // Call Supabase signOut API
      await supabase.auth.signOut({ scope: 'global' });
      
      console.log('AuthProvider: Sign out complete');
    } catch (err) {
      console.error('Error during sign out:', err);
    }
  };

  // Initialize auth and set up listener
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        console.log('AuthProvider: Initializing auth state');
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          console.log('AuthProvider: Found existing session');
          setUser(session.user);
          setSession(session);
          
          // Test database access
          await checkRLSPolicies();
        } else {
          console.log('AuthProvider: No existing session found');
          setUser(null);
          setSession(null);
          // Make sure loading is false when no session
          setLoading(false);
        }
      } catch (err) {
        console.error('AuthProvider: Error getting session:', err);
        setUser(null);
        setSession(null);
        setLoading(false);
      }
    };
    
    initializeAuth();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('AuthProvider: Auth state changed:', event);

      if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
        console.log('AuthProvider: User signed out or deleted');
        await handleSignOut();
      } else if (event === 'SIGNED_IN' && session?.user) {
        console.log('AuthProvider: User signed in:', session.user.email);
        setUser(session.user);
        setSession(session);
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
      // Clear existing state first
      setUser(null);
      setSession(null);
      
      // Force signOut first to ensure clean state
      await supabase.auth.signOut({ scope: 'global' });
      
      // Now sign in
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });
      
      if (signInError) {
        console.error('AuthProvider: Sign in error:', signInError);
        setError(signInError.message);
        setUser(null);
        setSession(null);
        return false;
      }
      
      console.log('AuthProvider: Sign in successful, user:', data.user?.email);
      setUser(data.user);
      setSession(data.session);
      return true;
    } catch (err) {
      console.error('AuthProvider: Error signing in:', err);
      setError('Failed to sign in');
      setUser(null);
      setSession(null);
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

  // Everyone is an admin in this app
  const isAdmin = true;

  const value = {
    session,
    user,
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