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
import { AlertTriangle, RefreshCw } from 'lucide-react';

function App() {
  const { user, loading: authLoading, isAdmin, error: authError, currentWorker, signOut } = useAuth();
  const [isJobFormOpen, setIsJobFormOpen] = useState(false);
  const [activeView, setActiveView] = useState<'week' | 'month'>('week');
  const [isRetrying, setIsRetrying] = useState(false);
  const { jobs, addJob, isLoading: isJobsLoading, error: jobsError } = useJobs({
    enabled: !!user
  });
  const { workers, isLoading: isWorkersLoading, error: workersError } = useWorkers({
    enabled: !!user
  });

  const handleNewJob = () => {
    if (!isAdmin) return;
    setIsJobFormOpen(true);
  };

  const handleSubmitJob = async (jobData: any) => {
    if (!isAdmin) return;
    try {
      await addJob(jobData);
      setIsJobFormOpen(false);
    } catch (error) {
      console.error('Error creating job:', error);
    }
  };

  // Show loading spinner while authenticating
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0a2342] mb-4"></div>
          <p className="text-gray-600">Loading application...</p>
        </div>
      </div>
    );
  }

  // Show login form if no user
  if (!user) {
    return <LoginForm />;
  }

  // Show loading spinner while fetching initial data
  if ((user && (isJobsLoading || isWorkersLoading))) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0a2342]"></div>
      </div>
    );
  }

  // Show account not linked message if no worker profile
  if (user && !currentWorker) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <div className="flex justify-center text-amber-500 mb-4">
            <AlertTriangle size={48} />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 text-center mb-4">Account Not Linked</h2>
          <p className="text-gray-600 mb-6">
            Your user account ({user.email}) is not associated with any worker in the system. 
            The system will attempt to create your profile automatically.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => window.location.reload()}
              disabled={isRetrying}
              className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-md disabled:opacity-50 flex items-center justify-center"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isRetrying ? 'animate-spin' : ''}`} />
              {isRetrying ? 'Retrying...' : 'Retry'}
            </button>
            <button
              onClick={() => signOut()}
              className="w-full py-2 px-4 border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium rounded-md"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

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
          <button
            onClick={() => window.location.reload()}
            className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-md"
          >
            Refresh Page
          </button>
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