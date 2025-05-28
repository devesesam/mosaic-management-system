import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Book as Roof, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { signIn, signUp, error, loading, setError, signOut } = useAuth();

  // Reset everything when the component mounts
  useEffect(() => {
    // Reset form state completely
    setEmail('');
    setPassword('');
    setIsSubmitting(false);
    setError(null);
    
    // Force sign out to ensure clean state
    const clearAuth = async () => {
      try {
        await signOut();
      } catch (err) {
        console.error('Error clearing auth state:', err);
      }
    };
    
    clearAuth();
  }, [signOut, setError]);

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
        await signUp(email, password);
        setIsSignUp(false);
        toast.success('Account created! Please sign in to continue.');
      } else {
        const success = await signIn(email, password);
        if (!success) {
          setError('Invalid email or password');
        }
      }
    } catch (err) {
      console.error('Error during auth:', err);
      setError('Authentication failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center">
            <Roof className="h-16 w-16 text-[#0a2342]" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Tasman Roofing
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Job Scheduling System
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
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
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting || loading}
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
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder={isSignUp ? 'Password (min. 6 characters)' : 'Password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting || loading}
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
              disabled={isSubmitting || loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-[#0a2342] hover:bg-[#0c2d5a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-70"
            >
              {isSubmitting || loading ? (
                <div className="flex items-center">
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {isSignUp ? 'Signing up...' : 'Signing in...'}
                </div>
              ) : (
                isSignUp ? 'Sign up' : 'Sign in'
              )}
            </button>
            
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
              }}
              disabled={isSubmitting || loading}
              className="text-sm text-indigo-600 hover:text-indigo-500 font-medium focus:outline-none disabled:opacity-50"
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>

            <div className="mt-4 text-xs text-center text-gray-500">
              Try these credentials:<br />
              Email: <span className="font-medium">damsevese@gmail.com</span><br />
              Password: <span className="font-medium">password</span>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginForm;