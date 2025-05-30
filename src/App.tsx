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
import { AlertTriangle, Database } from 'lucide-react';

function App() {
  const { user, authError, currentWorker, signOut } = useAuth();
  const [isJobFormOpen, setIsJobFormOpen] = useState(false);
  const [activeView, setActiveView] = useState<'week' | 'month'>('week');
  const [isRetrying, setIsRetrying] = useState(false);
  
  const { 
    jobs, 
    addJob, 
    error: jobsError, 
    refetch: refetchJobs,
    isLoading: jobsLoading 
  } = useJobs();
  
  const { 
    workers, 
    error: workersError, 
    refetch: refetchWorkers,
    isLoading: workersLoading 
  } = useWorkers();

  // Load data when component mounts or user changes
  useEffect(() => {
    if (user) {
      console.log('App: Initial data load');
      refetchJobs();
      refetchWorkers();
    }
  }, [user, refetchJobs, refetchWorkers]);

  // Set up periodic refresh
  useEffect(() => {
    if (!user) return;
    
    const interval = setInterval(() => {
      console.log('App: Periodic data refresh');
      try {
        refetchJobs();
        refetchWorkers();
      } catch (error) {
        console.error('Error during periodic refresh:', error);
      }
    }, 60000); // Refresh every 60 seconds
    
    return () => clearInterval(interval);
  }, [user, refetchJobs, refetchWorkers]);

  const handleNewJob = () => {
    setIsJobFormOpen(true);
  };

  const handleSubmitJob = async (jobData: any) => {
    try {
      await addJob(jobData);
      setIsJobFormOpen(false);
    } catch (error) {
      console.error('Error creating job:', error);
    }
  };

  // Show login form if no user
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
          <div className="flex flex-col space-y-3">
            <button
              onClick={() => {
                setIsRetrying(true);
                refetchJobs();
                refetchWorkers();
                setTimeout(() => setIsRetrying(false), 1000);
              }}
              className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-md flex items-center justify-center"
              disabled={isRetrying}
            >
              {isRetrying ? (
                <>
                  <div className="w-5 h-5 mr-2 border-t-2 border-b-2 border-white rounded-full animate-spin"></div>
                  Refreshing...
                </>
              ) : (
                'Refresh Data'
              )}
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

        <main className="flex-1 overflow-hidden relative">
          {activeView === 'week' ? (
            <WeekView />
          ) : (
            <MonthView />
          )}
        </main>

        {isJobFormOpen && (
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