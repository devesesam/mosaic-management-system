import React, { createContext, useContext, useState, useEffect } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { Worker } from '../types';
import toast from 'react-hot-toast';

// Import supabase client but don't use it for now
// import { supabase, getCurrentWorker, createWorkerProfile, ensureUserRecord } from '../lib/supabase';

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
  const [loading, setLoading] = useState(false); // Set to false initially to avoid loading state
  const [error, setError] = useState<string | null>(null);

  // Reset all state and clear storage
  const handleSignOut = async () => {
    try {
      setSession(null);
      setUser(null);
      setCurrentWorker(null);
      setError(null);
      localStorage.removeItem('supabase.auth.token');
      // Disabled: await supabase.auth.signOut();
      console.log('Signed out (mock)');
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  // Initialize auth and set up listener - DISABLED
  useEffect(() => {
    const initializeAuth = async () => {
      // DISABLED: Real Supabase authentication
      // try {
      //   console.log('AuthProvider: Initializing auth...');
      //   setLoading(true);
      //   
      //   const { data: { session } } = await supabase.auth.getSession();
      //   
      //   if (session?.user) {
      //     console.log('AuthProvider: Found existing session');
      //     setUser(session.user);
      //     setSession(session);
      //     
      //     // Try to get or create worker profile for this user
      //     if (session.user.email) {
      //       try {
      //         console.log('AuthProvider: Getting worker profile for', session.user.email);
      //         const worker = await getCurrentWorker(session.user.email);
      //         
      //         if (worker) {
      //           console.log('AuthProvider: Found worker profile:', worker);
      //           setCurrentWorker(worker);
      //         } else {
      //           console.log('AuthProvider: No worker profile found, explicitly creating one');
      //           const newWorker = await createWorkerProfile(session.user.email);
      //           console.log('AuthProvider: Created worker profile:', newWorker);
      //           setCurrentWorker(newWorker);
      //         }
      //         
      //         // Also ensure user record exists
      //         await ensureUserRecord(session.user.id, session.user.email);
      //       } catch (err) {
      //         console.error('Error getting/creating worker profile:', err);
      //       }
      //     }
      //   }
      // } catch (err) {
      //   console.error('AuthProvider: Error getting session:', err);
      // } finally {
      //   setLoading(false);
      // }

      // MOCK: Set fake logged-out state
      console.log('AuthProvider: Using mock authentication');
      setLoading(false);
    };
    
    initializeAuth();
    
    // DISABLED: Real Supabase auth listener
    // const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
    //   console.log('AuthProvider: Auth state changed:', event);
    //
    //   if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
    //     await handleSignOut();
    //   } else if (event === 'SIGNED_IN' && session?.user) {
    //     setUser(session.user);
    //     setSession(session);
    //     
    //     // Initialize worker profile in background
    //     if (session.user.email) {
    //       try {
    //         console.log('AuthProvider: Getting worker profile for', session.user.email);
    //         const worker = await getCurrentWorker(session.user.email);
    //         
    //         if (worker) {
    //           console.log('AuthProvider: Found worker profile:', worker);
    //           setCurrentWorker(worker);
    //         } else {
    //           console.log('AuthProvider: No worker profile found, creating one');
    //           const newWorker = await createWorkerProfile(session.user.email);
    //           console.log('AuthProvider: Created worker profile:', newWorker);
    //           setCurrentWorker(newWorker);
    //         }
    //         
    //         // Also ensure user record exists
    //         await ensureUserRecord(session.user.id, session.user.email);
    //       } catch (err) {
    //         console.error('Error fetching worker profile:', err);
    //       }
    //     }
    //   }
    // });
    //
    // return () => {
    //   subscription.unsubscribe();
    // };
    
    // No cleanup needed for our mock version
    return () => {};
  }, []);

  const signIn = async (email: string, password: string): Promise<boolean> => {
    setError(null);
    setLoading(true);
    
    try {
      console.log('AuthProvider: Mock sign in for:', email);
      
      // DISABLED: Real Supabase authentication
      // const { error: signInError } = await supabase.auth.signInWithPassword({ 
      //   email, 
      //   password 
      // });
      
      // Mock a delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // MOCK: Set fake user
      const mockUser = {
        id: '123456',
        email: email,
        created_at: new Date().toISOString(),
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        confirmed_at: new Date().toISOString()
      } as unknown as User;
      
      const mockSession = {
        access_token: 'mock_token',
        refresh_token: 'mock_refresh',
        expires_in: 3600,
        expires_at: 9999999999,
        user: mockUser
      } as Session;
      
      setUser(mockUser);
      setSession(mockSession);
      
      // Mock worker data
      setCurrentWorker({
        id: '12345',
        name: email.split('@')[0],
        email: email,
        role: 'admin',
        created_at: new Date().toISOString(),
        phone: null
      });
      
      console.log('AuthProvider: Mock sign in successful');
      
      setLoading(false);
      toast.success('Signed in (mock)');
      return true;
    } catch (err) {
      console.error('AuthProvider: Error in mock sign in:', err);
      setError('Failed to sign in');
      setLoading(false);
      return false;
    }
  };

  const signUp = async (email: string, password: string) => {
    setError(null);
    setLoading(true);
    
    // DISABLED: Real Supabase authentication
    // const { error: signUpError } = await supabase.auth.signUp({ 
    //   email, 
    //   password,
    //   options: {
    //     emailRedirectTo: window.location.origin
    //   }
    // });
    
    // Mock a delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    console.log('AuthProvider: Mock sign up for:', email);
    setLoading(false);
    toast.success('Account created! Please sign in with your credentials.');
    setError('Account created. Please sign in.');
  };

  const signOut = async () => {
    await handleSignOut();
  };

  const isAdmin = true;
  const authError = null; // Mock no auth errors

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