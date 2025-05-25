import React, { useState } from 'react';
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
  const { user, loading: authLoading, error: authError, signOut } = useAuth();
  const [isJobFormOpen, setIsJobFormOpen] = useState(false);
  const [activeView, setActiveView] = useState<'week' | 'month'>('week');
  
  const { jobs, addJob, isLoading: isJobsLoading } = useJobs({
    enabled: !!user
  });
  
  const { workers, isLoading: isWorkersLoading } = useWorkers({
    enabled: !!user
  });

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

  // Show loading screen when authenticating
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center">
          <Loader2 className="h-10 w-10 text-indigo-600 animate-spin mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

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
  
  // Show loading spinner while fetching initial data
  if (isJobsLoading || isWorkersLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 text-indigo-600 animate-spin mb-4" />
        <p className="text-gray-600">Loading calendar data...</p>
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