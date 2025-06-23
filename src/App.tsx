import React, { useState, useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useAuth } from './context/AuthContext';
import LoginForm from './components/auth/LoginForm';
import Navbar from './components/layout/Navbar';
import WeekView from './components/scheduler/WeekView';
import MonthView from './components/scheduler/MonthView';
import JobForm from './components/jobs/JobForm';
import { useJobsStore } from './store/jobsStore';
import { useWorkerStore } from './store/workersStore';
import { Toaster } from 'react-hot-toast';
import { AlertTriangle } from 'lucide-react';

function App() {
  const { user, authError, currentWorker, signOut, isEditable } = useAuth();
  const [isJobFormOpen, setIsJobFormOpen] = useState(false);
  const [activeView, setActiveView] = useState<'week' | 'month'>('week');
  const [isRetrying, setIsRetrying] = useState(false);
  
  const { 
    jobs, 
    addJob, 
    error: jobsError, 
    fetchJobs,
    isLoading: jobsLoading 
  } = useJobsStore();
  
  const { 
    workers, 
    error: workersError, 
    fetchWorkers,
    isLoading: workersLoading 
  } = useWorkerStore();

  // Load data when component mounts - no auth dependency
  useEffect(() => {
    console.log('App: Initial data load');
    fetchJobs();
    fetchWorkers();
  }, [fetchJobs, fetchWorkers]);

  // Set up periodic refresh without auth dependency
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('App: Periodic data refresh');
      try {
        fetchJobs();
        fetchWorkers();
      } catch (error) {
        console.error('Error during periodic refresh:', error);
      }
    }, 60000); // Refresh every minute
    
    return () => clearInterval(interval);
  }, [fetchJobs, fetchWorkers]);

  // Log edit permission status
  useEffect(() => {
    if (currentWorker) {
      console.log('App: User edit permissions:', {
        email: currentWorker.email,
        isEditable,
        mode: isEditable ? 'EDIT' : 'READ-ONLY'
      });
    }
  }, [currentWorker, isEditable]);

  const handleNewJob = () => {
    if (!isEditable) {
      console.log('App: New job creation blocked - read-only mode');
      return;
    }
    setIsJobFormOpen(true);
  };

  const handleSubmitJob = async (jobData: any) => {
    if (!isEditable) {
      console.log('App: Job submission blocked - read-only mode');
      return;
    }
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
                fetchJobs();
                fetchWorkers();
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
          isEditable={isEditable}
        />

        {/* Show read-only notice if user doesn't have edit permissions */}
        {!isEditable && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2">
            <div className="flex items-center justify-center">
              <div className="flex items-center text-amber-700">
                <AlertTriangle className="h-4 w-4 mr-2" />
                <span className="text-sm font-medium">
                  You are in read-only mode. Contact an administrator to request edit access.
                </span>
              </div>
            </div>
          </div>
        )}

        <main className="flex-1 overflow-hidden relative">
          {activeView === 'week' ? (
            <WeekView readOnly={!isEditable} />
          ) : (
            <MonthView readOnly={!isEditable} />
          )}
        </main>

        {isJobFormOpen && (
          <JobForm
            onClose={() => setIsJobFormOpen(false)}
            onSubmit={handleSubmitJob}
            readOnly={!isEditable}
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