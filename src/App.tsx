import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from './context/AuthContext';
import LoginForm from './components/auth/LoginForm';
import Navbar from './components/layout/Navbar';
import WeekView from './components/scheduler/WeekView';
import MonthView from './components/scheduler/MonthView';
import { TaskForm } from './components/tasks';
import { useTasksQuery, useAddTask, taskKeys } from './hooks/useTasks';
import { useTeamMembersQuery, teamKeys } from './hooks/useTeamMembers';
import { useRealtimeTasks } from './hooks/useRealtimeTasks';
import { useRealtimeTeam } from './hooks/useRealtimeTeam';
import { Toaster } from 'react-hot-toast';
import { AlertTriangle } from 'lucide-react';
import { Task } from './types';
import { logger } from './utils/logger';
import ErrorBoundary from './components/layout/ErrorBoundary';

function App() {
  const { user, authError, currentWorker, signOut, isEditable } = useAuth();
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  // Derive active view from current route
  const activeView: 'week' | 'month' = location.pathname === '/month' ? 'month' : 'week';

  // React Query hooks for data fetching (with caching and deduplication)
  const {
    data: tasks = [],
    error: tasksQueryError,
    isLoading: tasksLoading,
    refetch: refetchTasks,
  } = useTasksQuery(currentWorker?.id, false);

  const {
    data: teamMembers = [],
    error: teamQueryError,
    isLoading: teamLoading,
    refetch: refetchTeam,
  } = useTeamMembersQuery();

  const addTaskMutation = useAddTask();

  // Convert query errors to strings for display
  const tasksError = tasksQueryError?.message || null;
  const teamError = teamQueryError?.message || null;

  // Subscribe to real-time updates (incremental cache updates)
  useRealtimeTasks();
  useRealtimeTeam();

  // Refresh data when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        logger.debug('App: Tab became visible, invalidating queries');
        queryClient.invalidateQueries({ queryKey: taskKeys.all });
        queryClient.invalidateQueries({ queryKey: teamKeys.all });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [queryClient]);

  // Log edit permission status
  useEffect(() => {
    if (currentWorker) {
      logger.debug('App: User edit permissions:', {
        email: currentWorker.email,
        isEditable,
        mode: isEditable ? 'EDIT' : 'READ-ONLY'
      });
    }
  }, [currentWorker, isEditable]);

  // Force week view for read-only users
  useEffect(() => {
    if (!isEditable && activeView !== 'week') {
      logger.debug('App: Forcing week view for read-only user');
      navigate('/week', { replace: true });
    }
  }, [isEditable, activeView, navigate]);

  const handleNewTask = () => {
    if (!isEditable) {
      logger.debug('App: New task creation blocked - read-only mode');
      return;
    }
    setIsTaskFormOpen(true);
  };

  const handleSubmitTask = async (taskData: Omit<Task, 'id' | 'created_at'>) => {
    if (!isEditable) {
      logger.debug('App: Task submission blocked - read-only mode');
      return;
    }
    try {
      await addTaskMutation.mutateAsync(taskData);
      setIsTaskFormOpen(false);
    } catch (error) {
      logger.error('Error creating task:', error);
    }
  };

  const handleSetActiveView = (view: 'week' | 'month') => {
    // Only allow view changes for users with edit permissions
    if (!isEditable) {
      logger.debug('App: View change blocked - read-only mode forces week view');
      return;
    }
    navigate(`/${view}`);
  };

  // Show login form if no user
  if (!user) {
    return <LoginForm />;
  }

  // Show auth error if present
  if (authError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-garlic">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <div className="flex justify-center text-red-500 mb-4">
            <AlertTriangle size={48} />
          </div>
          <h2 className="text-2xl font-bogart font-medium text-charcoal text-center mb-4">Authentication Error</h2>
          <p className="text-gray-600 mb-6 text-center">{authError}</p>
          <button
            onClick={() => signOut()}
            className="w-full py-2 px-4 bg-blueberry hover:bg-blueberry/90 text-white font-medium rounded-md"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  // Show error if there's any problem with the tasks or team data
  if (tasksError || teamError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-garlic">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <div className="flex justify-center text-red-500 mb-4">
            <AlertTriangle size={48} />
          </div>
          <h2 className="text-2xl font-bogart font-medium text-charcoal text-center mb-4">Error Loading Data</h2>
          <p className="text-gray-600 mb-6">
            {tasksError || teamError || 'Failed to load data. Please try refreshing the page.'}
          </p>
          <div className="flex flex-col space-y-3">
            <button
              onClick={() => {
                setIsRetrying(true);
                refetchTasks();
                refetchTeam();
                setTimeout(() => setIsRetrying(false), 1000);
              }}
              className="w-full py-2 px-4 bg-blueberry hover:bg-blueberry/90 text-white font-medium rounded-md flex items-center justify-center"
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
      <div className="flex flex-col h-screen bg-vanilla">
        <Navbar
          onNewTask={handleNewTask}
          activeView={activeView}
          setActiveView={handleSetActiveView}
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
          <ErrorBoundary
            fallbackTitle="Calendar Error"
            fallbackMessage="The calendar view encountered an error. Try refreshing the page."
          >
            <Routes>
              <Route path="/week" element={<WeekView readOnly={!isEditable} />} />
              <Route path="/month" element={<MonthView readOnly={!isEditable} />} />
              <Route path="/" element={<Navigate to="/week" replace />} />
              <Route path="*" element={<Navigate to="/week" replace />} />
            </Routes>
          </ErrorBoundary>
        </main>

        {isTaskFormOpen && (
          <ErrorBoundary
            fallbackTitle="Form Error"
            fallbackMessage="The task form encountered an error."
          >
            <TaskForm
              onClose={() => setIsTaskFormOpen(false)}
              onSubmit={handleSubmitTask}
              readOnly={!isEditable}
            />
          </ErrorBoundary>
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
