// Re-export everything from tasksStore for backwards compatibility
export {
  useTasksStore as useJobsStore,
  useTasks as useJobs,
  useTasksLoading as useJobsLoading,
  useTasksError as useJobsError,
  useSelectedTask as useSelectedJob,
  useTaskActions as useJobActions
} from './tasksStore';
