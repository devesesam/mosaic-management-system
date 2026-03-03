/**
 * Real-time task subscription - DISABLED
 *
 * We don't use real-time subscriptions for tasks because:
 * 1. Your own changes are instant via optimistic updates
 * 2. Other users' changes appear when you refresh or switch tabs
 * 3. Real-time adds complexity with visibility filtering and cache key management
 *
 * The tab visibility handler in App.tsx refetches data when the user returns.
 */
export function useRealtimeTasks() {
  // No-op - real-time disabled for simplicity
}

// Backwards compatibility alias
export const useRealtimeJobs = useRealtimeTasks;
