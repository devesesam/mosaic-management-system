import React, { useState, useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useAuth } from './context/AuthContext';
import LoginForm from './components/auth/LoginForm';
import Navbar from './components/layout/Navbar';
import WeekView from './components/scheduler/WeekView';
import MonthView from './components/scheduler/MonthView';
import JobForm from './components/jobs/JobForm';
import { useJobs } from './hooks/useJobs';
import { useWorkers } from './hooks/useWorkers';
import { Toaster } from 'react-hot-toast';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { supabase } from './lib/supabase';

function App() {
  const { user, loading: authLoading, isAdmin, error: authError, currentWorker, signOut } = useAuth();
  const [isJobFormOpen, setIsJobFormOpen] = useState(false);
  const [activeView, setActiveView] = useState<'week' | 'month'>('week');
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  
  // Don't depend on currentWorker to enable data loading
  const { jobs, addJob, isLoading: isJobsLoading, error: jobsError, refetch: refetchJobs } = useJobs({
    enabled: !!user
  });
  
  const { workers, isLoading: isWorkersLoading, error: workersError, refetch: refetchWorkers } = useWorkers({
    enabled: !!user
  });

  // Force data refresh when component mounts
  useEffect(() => {
    if (user) {
      console.log('App: Authenticated - Starting data fetch');
      
      // Force immediate data refresh on component mount
      refetchJobs();
      refetchWorkers();
      
      // Set up periodic refresh
      const interval = setInterval(() => {
        refetchJobs();
        refetchWorkers();
      }, 5000); // Refresh every 5 seconds
      
      return () => clearInterval(interval);
    }
  }, [user, refetchJobs, refetchWorkers]);
  
  // Add a loading timeout to proceed even if data is still loading
  useEffect(() => {
    if ((isJobsLoading || isWorkersLoading || authLoading) && !loadingTimeout) {
      console.log('App: Loading timeout started');
      const timeoutId = setTimeout(() => {
        console.log('App: Loading timeout reached - Proceeding anyway');
        setLoadingTimeout(true);
      }, 10000); // 10 second timeout
      
      return () => clearTimeout(timeoutId);
    }
  }, [isJobsLoading, isWorkersLoading, authLoading, loadingTimeout]);
  
  // When user logs in, try to force a direct database connection
  useEffect(() => {
    if (user && !jobs.length && !workers.length) {
      const checkDatabase = async () => {
        try {
          console.log('App: Performing direct database check');
          const { data: jobsCheck } = await supabase.from('jobs').select('*');
          console.log(`App: Direct check found ${jobsCheck?.length || 0} jobs`);
          
          const { data: workersCheck } = await supabase.from('workers').select('*');
          console.log(`App: Direct check found ${workersCheck?.length || 0} workers`);
          
          if (jobsCheck?.length || workersCheck?.length) {
            // Force refresh if we found data
            refetchJobs();
            refetchWorkers();
          }
        } catch (err) {
          console.error('App: Direct database check failed', err);
        }
      };
      
      checkDatabase();
    }
  }, [user, jobs.length, workers.length, refetchJobs, refetchWorkers]);

  const handleNewJob = () => {
    if (!isAdmin) return;
    setIsJobFormOpen(true);
  };

  const handleSubmitJob = async (jobData: any) => {
    if (!isAdmin) return;
    try {
      await addJob(jobData);
      setIsJobFormOpen(false);
      // Immediately refetch data after adding a job
      refetchJobs();
    } catch (error) {
      console.error('Error creating job:', error);
    }
  };

  // Show login form if no user - immediately show this instead of loading screen
  if (!user) {
    return <LoginForm />;
  }

  // Show auth error if present
  if (authError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <div className="flex justify-center text-red-500 mb-4">
            <AlertTriangle size={48} />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 text-center mb-4">Authentication Error</h2>
          <p className="text-gray-600 mb-6 text-center">{authError}</p>
          <button
            onClick={() => signOut()}
            className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-md"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  // Show loading spinner while fetching initial data, but with a timeout override
  if ((isJobsLoading || isWorkersLoading || authLoading) && !loadingTimeout) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-4" />
        <p className="text-gray-600 mb-2">Loading calendar data...</p>
        <div className="text-xs text-gray-400">
          {isJobsLoading ? "Loading jobs... " : ""}
          {isWorkersLoading ? "Loading workers... " : ""}
          {authLoading ? "Loading user profile... " : ""}
        </div>
        
        <button
          onClick={() => setLoadingTimeout(true)}
          className="mt-6 text-sm underline text-indigo-500 hover:text-indigo-700"
        >
          Continue anyway
        </button>
      </div>
    );
  }

  // Show error if there's any problem with the jobs or workers data
  if (jobsError || workersError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <div className="flex justify-center text-red-500 mb-4">
            <AlertTriangle size={48} />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 text-center mb-4">Error Loading Data</h2>
          <p className="text-gray-600 mb-6">
            {jobsError?.message || workersError?.message || 'Failed to load data. Please try refreshing the page.'}
          </p>
          <div className="space-y-3">
            <div className="text-sm text-gray-500">
              <p className="font-medium">Diagnostic Information:</p>
              <p>Jobs: {jobs?.length || 0}</p>
              <p>Workers: {workers?.length || 0}</p>
              <p>User email: {user.email}</p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-md"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex flex-col h-screen bg-gray-100">
        <Navbar 
          onNewJob={handleNewJob} 
          activeView={activeView}
          setActiveView={setActiveView}
        />

        <main className="flex-1 overflow-hidden">
          {activeView === 'week' ? (
            <WeekView readOnly={!isAdmin} />
          ) : (
            <MonthView readOnly={!isAdmin} />
          )}
        </main>

        {isJobFormOpen && isAdmin && (
          <JobForm
            onClose={() => setIsJobFormOpen(false)}
            onSubmit={handleSubmitJob}
          />
        )}

        <Toaster 
          position="bottom-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#fff',
              color: '#333',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
              borderRadius: '0.5rem',
              padding: '0.75rem 1rem',
            },
          }}
        />
      </div>
    </DndProvider>
  );
}

export default App;