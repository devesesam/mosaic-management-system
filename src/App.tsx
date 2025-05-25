import React, { useState, useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useAuth } from './context/AuthContext';
import LoginForm from './components/auth/LoginForm';
import Navbar from './components/layout/Navbar';
import WeekView from './components/scheduler/WeekView';
import MonthView from './components/scheduler/MonthView';
import JobForm from './components/jobs/JobForm';
import { useJobStore } from './store/jobStore';
import { Toaster } from 'react-hot-toast';
import { AlertTriangle } from 'lucide-react';

function App() {
  const { user, loading, isAdmin, error: authError, currentWorker, signOut } = useAuth();
  const [isJobFormOpen, setIsJobFormOpen] = useState(false);
  const [activeView, setActiveView] = useState<'week' | 'month'>('week');
  const { addJob, fetchJobs } = useJobStore();
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showApp, setShowApp] = useState(false);

  useEffect(() => {
    // Reset showApp when user logs out
    if (!user) {
      setShowApp(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      console.log('App: User authenticated, fetching jobs');
      fetchJobs().catch(error => {
        console.error('App: Error fetching jobs:', error);
        setFetchError('Failed to load jobs. Please try refreshing the page.');
      });
    }
  }, [user, fetchJobs]);

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

  if (!user) {
    return <LoginForm onSuccess={() => setShowApp(true)} />;
  }

  if (loading && user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0a2342]"></div>
      </div>
    );
  }

  if (user && !currentWorker) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <div className="flex justify-center text-amber-500 mb-4">
            <AlertTriangle size={48} />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 text-center mb-4">Account Not Linked</h2>
          <p className="text-gray-600 mb-6">
            Your user account ({user.email}) is not associated with any worker in the system. 
            Please contact your administrator.
          </p>
          <button
            onClick={() => signOut()}
            className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-md"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <div className="flex justify-center text-red-500 mb-4">
            <AlertTriangle size={48} />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 text-center mb-4">Error Loading Data</h2>
          <p className="text-gray-600 mb-6">{fetchError}</p>
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
  )
}

export default App