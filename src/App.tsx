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
import { AlertTriangle, RefreshCw, Bug } from 'lucide-react';
import toast from 'react-hot-toast';

function App() {
  const { user, error: authError, signOut } = useAuth();
  const [isJobFormOpen, setIsJobFormOpen] = useState(false);
  const [activeView, setActiveView] = useState<'week' | 'month'>('week');
  const [isRetrying, setIsRetrying] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  
  const { 
    jobs, 
    addJob, 
    error: jobsError, 
    refetch: refetchJobs,
    isRefetching: isRefetchingJobs
  } = useJobs();
  
  const { 
    workers, 
    error: workersError, 
    refetch: refetchWorkers,
    isRefetching: isRefetchingWorkers
  } = useWorkers();

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
  
  // Force refresh data when user logs in and periodically
  useEffect(() => {
    if (user) {
      console.log('App: User authenticated, forcing data refresh');
      // Force immediate data refresh
      refetchJobs();
      refetchWorkers();
      
      // Set up periodic refresh
      const interval = setInterval(() => {
        console.log('App: Periodic data refresh');
        refetchJobs();
        refetchWorkers();
      }, 30000); // Every 30 seconds
      
      return () => clearInterval(interval);
    }
  }, [user, refetchJobs, refetchWorkers]);

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
          <p className="text-gray-600 mb-6 text-center">
            {jobsError?.message || workersError?.message || 'Failed to load data. Please try again.'}
          </p>
          <button
            onClick={() => {
              setIsRetrying(true);
              Promise.all([refetchJobs(), refetchWorkers()])
                .finally(() => setIsRetrying(false));
            }}
            disabled={isRetrying}
            className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-md flex items-center justify-center"
          >
            {isRetrying ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Retrying...
              </>
            ) : (
              'Retry Loading Data'
            )}
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

        {/* Debug Panel */}
        <div className="bg-gray-800 text-white p-2 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowDebug(!showDebug)}
              className="flex items-center space-x-1 px-2 py-1 rounded bg-gray-700 hover:bg-gray-600"
            >
              <Bug size={16} />
              <span>Debug</span>
            </button>
            
            <div className="text-sm">
              <span className="mr-4">Workers: {workers.length}</span>
              <span>Jobs: {jobs.length}</span>
            </div>
          </div>

          <button
            onClick={() => {
              setIsRetrying(true);
              Promise.all([refetchJobs(), refetchWorkers()])
                .finally(() => {
                  setIsRetrying(false);
                  toast.success('Data refreshed');
                });
            }}
            disabled={isRetrying || isRefetchingJobs || isRefetchingWorkers}
            className="flex items-center space-x-1 px-2 py-1 rounded bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm"
          >
            <RefreshCw size={14} className={isRetrying || isRefetchingJobs || isRefetchingWorkers ? 'animate-spin' : ''} />
            <span>Refresh Data</span>
          </button>
        </div>

        {/* Debug Information */}
        {showDebug && (
          <div className="bg-gray-900 text-white p-4 overflow-auto max-h-64">
            <div className="mb-3">
              <h3 className="text-lg font-semibold mb-1">Workers ({workers.length})</h3>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {workers.map(worker => (
                  <div key={worker.id} className="bg-gray-800 p-2 rounded">
                    <div className="font-medium">{worker.name}</div>
                    <div className="opacity-70">{worker.email}</div>
                    <div className="opacity-70">ID: {worker.id.substring(0, 8)}...</div>
                  </div>
                ))}
                {workers.length === 0 && <div className="text-red-400">No workers found</div>}
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-1">Jobs ({jobs.length})</h3>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {jobs.slice(0, 6).map(job => (
                  <div key={job.id} className="bg-gray-800 p-2 rounded">
                    <div className="font-medium">{job.address}</div>
                    <div className="opacity-70">{job.customer_name || 'No customer'}</div>
                    <div className="opacity-70">Worker: {job.worker_id ? workers.find(w => w.id === job.worker_id)?.name || 'Unknown' : 'None'}</div>
                  </div>
                ))}
                {jobs.length > 6 && <div className="opacity-70">...and {jobs.length - 6} more</div>}
                {jobs.length === 0 && <div className="text-red-400">No jobs found</div>}
              </div>
            </div>
          </div>
        )}

        <main className="flex-1 overflow-hidden">
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