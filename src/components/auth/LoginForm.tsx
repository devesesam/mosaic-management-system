import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import mosaicLogo from '../../assets/MosaicLogo.png';

const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { signIn, signUp, error, loading, setError, signOut } = useAuth();

  // Ensure the user is always signed out when they reach the login page
  useEffect(() => {
    // Call signOut to ensure clean auth state
    signOut();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Display toast error notification when error state changes
  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // Password validation for sign up
    if (isSignUp && password.length < 6) {
      setError('Password must be at least 6 characters long');
      setIsSubmitting(false);
      return;
    }

    try {
      if (isSignUp) {
        await signUp(email, password, name.trim() || undefined);
        setIsSignUp(false);
        setName('');
        toast.success('Account created! Please sign in to continue.');
      } else {
        await signIn(email, password);
        // The error will be set by the signIn function if there's a problem
      }
    } catch (err) {
      console.error('Error during auth:', err);
      setError('Authentication failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-garlic py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center">
            <img src={mosaicLogo} alt="Mosaic" className="h-20 w-auto" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-bogart font-medium text-charcoal">
            Mosaic
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Team Scheduling System
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            {isSignUp && (
              <div>
                <label htmlFor="name" className="sr-only">
                  Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-charcoal rounded-t-md focus:outline-none focus:ring-margaux focus:border-margaux focus:z-10 sm:text-sm"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
            )}
            <div>
              <label htmlFor="email-address" className="sr-only">
                Email address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className={`appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-charcoal ${!isSignUp ? 'rounded-t-md' : ''} focus:outline-none focus:ring-margaux focus:border-margaux focus:z-10 sm:text-sm`}
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-charcoal rounded-b-md focus:outline-none focus:ring-margaux focus:border-margaux focus:z-10 sm:text-sm"
                placeholder={isSignUp ? 'Password (min. 6 characters)' : 'Password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center font-medium">
              {error}
            </div>
          )}

          <div className="flex flex-col space-y-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-aubergine hover:bg-aubergine/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-margaux disabled:opacity-70"
            >
              {isSubmitting ? (
                <span className="flex items-center">
                  <div className="animate-spin -ml-1 mr-3 h-4 w-4 text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                  {isSignUp ? 'Signing up...' : 'Signing in...'}
                </span>
              ) : (
                isSignUp ? 'Sign up' : 'Sign in'
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setName('');
              }}
              className="text-sm text-margaux hover:text-blueberry font-medium focus:outline-none"
              disabled={isSubmitting}
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginForm;
