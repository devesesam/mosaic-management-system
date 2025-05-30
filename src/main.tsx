import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './context/AuthContext.tsx';
import { verifySupabaseConnection } from './lib/supabase';

// First verify Supabase connection on app start
verifySupabaseConnection()
  .then(status => {
    console.log('Initial Supabase connection check:', status.connected ? 'Connected' : 'Failed');
    
    // Create query client with better error handling
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 1000 * 60 * 5, // 5 minutes
          retry: 3,
          retryDelay: (attemptIndex) => Math.min(1000 * (2 ** attemptIndex), 30000), // Exponential backoff
        },
        mutations: {
          retry: 2,
          retryDelay: (attemptIndex) => Math.min(1000 * (2 ** attemptIndex), 15000),
        },
      },
    });

    // Render app
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <App />
          </AuthProvider>
        </QueryClientProvider>
      </StrictMode>
    );
  })
  .catch(error => {
    console.error('Failed to start application:', error);
    
    // Still render app but with error handling in place
    const queryClient = new QueryClient();
    
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <App />
          </AuthProvider>
        </QueryClientProvider>
      </StrictMode>
    );
  });