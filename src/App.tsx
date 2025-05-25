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

function App() {
  const { user, loading: authLoading, isAdmin, error: authError, currentWorker, signOut } = useAuth();
  const [isJobFormOpen, setIsJobFormOpen] = useState(false);
  const [activeView, setActiveView] = useState<'week' | 'month'>('week');
  
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

  // Show loading spinner while fetching initial data
  if (isJobsLoading || isWorkersLoading || authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-4" />
        <p className="text-gray-600">Loading calendar data...</p>
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