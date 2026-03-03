# Performance Optimization Guide

## Overview
This document describes the performance optimization patterns used in the Mosaic Scheduler and how to maintain them for future development.

**Updated for v0.3.0:** This guide now reflects the React Query + incremental cache updates architecture.

---

## Architecture: React Query + Incremental Real-time

### Data Fetching (v0.3.0+)
The app uses **React Query (TanStack Query)** for data fetching with automatic caching and deduplication.

**Key Benefits:**
- Multiple components = 1 network request (automatic deduplication)
- 5-minute stale time (cache validity)
- Automatic retries with exponential backoff
- Background refetching on window focus

**Configuration (src/main.tsx):**
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
      retryDelay: 1000,
      refetchOnWindowFocus: false,
    },
  },
});
```

### Real-time: Incremental Cache Updates
The app uses **Supabase Realtime** with **incremental cache updates** instead of full refetch.

**Before (O(n) - Bad):**
```typescript
// OLD - Full refetch on every change
fetchTasks(); // Refetches ALL tasks from database
```

**After (O(1) - Good):**
```typescript
// NEW - Update only the affected item in cache
queryClient.setQueryData<Task[]>(taskKeys.all, (old) => {
  if (!old) return [newTask];
  return [newTask, ...old]; // Just prepend the new task
});
```

**Key Files:**
- `src/hooks/useRealtimeTasks.ts` - Incremental task updates via cache
- `src/hooks/useRealtimeTeam.ts` - Incremental team updates via cache
- `src/App.tsx` - Initializes realtime hooks

**Usage:**
```typescript
// In App.tsx (already implemented)
import { useRealtimeTasks } from './hooks/useRealtimeTasks';
import { useRealtimeTeam } from './hooks/useRealtimeTeam';

function App() {
  // Subscribe to real-time updates (incremental)
  useRealtimeTasks();
  useRealtimeTeam();

  // ... rest of component
}
```

### When to Add New Realtime Subscriptions

If you add a new table that needs real-time sync, use **incremental cache updates**:

```typescript
// src/hooks/useRealtimeCustomers.ts
import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../api/supabaseClient';
import { Customer } from '../types';
import { customerKeys } from './useCustomers';
import { logger } from '../utils/logger';

export function useRealtimeCustomers() {
  const queryClient = useQueryClient();
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const isSubscribedRef = useRef(false);

  useEffect(() => {
    if (isSubscribedRef.current) return;
    isSubscribedRef.current = true;

    subscriptionRef.current = supabase
      .channel('customers-realtime-changes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'customers'
      }, (payload) => {
        logger.debug('useRealtimeCustomers: INSERT', payload.new);
        const newCustomer = payload.new as Customer;

        // O(1) incremental update
        queryClient.setQueryData<Customer[]>(customerKeys.list(), (old) => {
          if (!old) return [newCustomer];
          if (old.some(c => c.id === newCustomer.id)) return old;
          return [newCustomer, ...old];
        });
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'customers'
      }, (payload) => {
        const updated = payload.new as Customer;
        queryClient.setQueryData<Customer[]>(customerKeys.list(), (old) => {
          if (!old) return old;
          return old.map(c => c.id === updated.id ? updated : c);
        });
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'customers'
      }, (payload) => {
        const deletedId = (payload.old as { id: string }).id;
        queryClient.setQueryData<Customer[]>(customerKeys.list(), (old) => {
          if (!old) return old;
          return old.filter(c => c.id !== deletedId);
        });
      })
      .subscribe();

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
      isSubscribedRef.current = false;
    };
  }, [queryClient]);
}
```

---

## React Performance Patterns

### React.memo for Expensive Components
Large components that render many children should be memoized to prevent unnecessary re-renders.

**Memoized Components:**
- `CalendarGrid` - The main calendar grid
- `WorkerRow` - Each team member's row
- `CalendarCell` - Each day cell

**Pattern:**
```typescript
const WorkerRow = React.memo(function WorkerRow({
  workerId,
  workerName,
  days,
  // ... other props
}: WorkerRowProps) {
  // Component implementation
}, (prevProps: WorkerRowProps, nextProps: WorkerRowProps) => {
  // Custom comparison - return true if props are "equal" (no re-render needed)
  if (prevProps.workerId !== nextProps.workerId) return false;
  if (prevProps.workerName !== nextProps.workerName) return false;
  if (prevProps.readOnly !== nextProps.readOnly) return false;

  // Compare arrays shallowly
  if (prevProps.days.length !== nextProps.days.length) return false;
  if (prevProps.days[0]?.getTime() !== nextProps.days[0]?.getTime()) return false;

  return true;
});
```

**When to Use React.memo:**
- Components that render frequently due to parent re-renders
- Components with expensive child trees
- Components receiving stable props that rarely change

**When NOT to Use React.memo:**
- Simple components with few renders
- Components that always receive new props
- Components where the comparison is more expensive than re-rendering

### Pre-computed Maps for O(1) Lookups
Instead of filtering arrays on every callback, pre-compute lookup maps.

**Before (O(n) per lookup):**
```typescript
const getWorkerDayJobs = useCallback((workerId, day) => {
  return jobs.filter(job => {
    // Complex filtering logic run on every call
  });
}, [jobs]);
```

**After (O(1) lookup):**
```typescript
// Pre-compute all worker-day combinations once
const workerDayJobsMap = React.useMemo(() => {
  const map = new Map<string, Job[]>();

  jobs.forEach(job => {
    // Build the map once
    const key = `${job.worker_id || 'null'}-${format(jobDate, 'yyyy-MM-dd')}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(job);
  });

  return map;
}, [jobs, weekDays]);

// Fast O(1) lookup
const getWorkerDayJobs = useCallback((workerId, day) => {
  const key = `${workerId || 'null'}-${format(day, 'yyyy-MM-dd')}`;
  return workerDayJobsMap.get(key) || [];
}, [workerDayJobsMap]);
```

---

## React Query Caching (v0.3.0+)

### Automatic Request Deduplication
React Query automatically deduplicates requests when multiple components use the same query:

```typescript
// In ComponentA
const { data: tasks } = useTasksQuery();

// In ComponentB (same query key)
const { data: tasks } = useTasksQuery();

// Result: Only 1 network request is made!
```

### Query Keys
Use the exported query key factories for consistent cache management:

```typescript
import { taskKeys } from '../hooks/useTasks';
import { teamKeys } from '../hooks/useTeamMembers';

// Query keys
taskKeys.all       // ['tasks']
taskKeys.list()    // ['tasks', { workerId, isAdmin }]
teamKeys.all       // ['teamMembers']
teamKeys.list()    // ['teamMembers', 'list']
```

### Cache Invalidation After Mutations
Mutations automatically invalidate related queries:

```typescript
// In src/hooks/useTasks.ts
export function useAddTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: addTaskApi,
    onSuccess: (newTask) => {
      // Option 1: Invalidate (triggers refetch)
      queryClient.invalidateQueries({ queryKey: taskKeys.all });

      // Option 2: Direct cache update (faster, no network request)
      queryClient.setQueryData<Task[]>(taskKeys.all, (old) => {
        return old ? [newTask, ...old] : [newTask];
      });
    },
  });
}
```

### Stale Time Configuration
Data is considered "fresh" for 5 minutes before refetching:

```typescript
// src/main.tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});
```

### NOTE: Zustand Stores Removed
As of v0.3.0, Zustand stores have been **deleted**. Do NOT recreate them. React Query provides:
- Better caching
- Automatic deduplication
- Built-in loading/error states
- DevTools for debugging

---

## Performance Checklist for New Features

### Before Implementation
- [ ] Will this component render frequently? → Consider React.memo
- [ ] Does this component filter large arrays? → Consider pre-computed maps
- [ ] Does this component need data fetching? → Use existing React Query hooks

### During Implementation
- [ ] Use React Query hooks (not direct fetch calls)
- [ ] Avoid creating new objects/arrays in render (use useMemo/useCallback)
- [ ] Avoid inline function definitions for event handlers passed to memoized children
- [ ] Use stable keys for lists (not array index)

### After Implementation
- [ ] Test with React DevTools Profiler
- [ ] Check for unnecessary re-renders
- [ ] Verify bundle size hasn't increased significantly
- [ ] Confirm real-time updates work correctly

---

## Debugging Performance Issues

### React DevTools Profiler
1. Install React DevTools browser extension
2. Open DevTools → Profiler tab
3. Click "Record" and perform the slow action
4. Stop recording and analyze:
   - Components that re-render
   - Time spent in each component
   - Why components re-rendered

### Common Issues

| Symptom | Likely Cause | Solution |
|---------|--------------|----------|
| Entire calendar re-renders on any change | Missing React.memo | Add memoization with custom comparison |
| Lag when typing in search | No debounce | Use `useDebouncedCallback` |
| Slow initial load | Too many tasks fetched | Implement pagination |
| Data not updating | Cache not invalidated | Check mutation's onSuccess handler |
| Multiple network requests | Not using query hooks | Use `useTasksQuery()` from hooks |

### Performance Monitoring
Check the console for these debug logs (when `VITE_LOG_LEVEL=debug`):
- `useRealtimeTasks: Subscription status` - Realtime connection health
- `useRealtimeTasks: INSERT/UPDATE/DELETE event` - Cache updates
- `App: Tab became visible, invalidating queries` - Visibility API working

### React Query DevTools
For development debugging, you can add React Query DevTools:
```typescript
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// In App.tsx (development only)
{import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
```

---

## Files Reference

### React Query Hooks (v0.3.0+)
| File | Purpose |
|------|---------|
| `src/hooks/useTasks.ts` | Task CRUD with caching, mutations, query keys |
| `src/hooks/useTeamMembers.ts` | Team member CRUD with caching, mutations, query keys |

### Realtime Hooks (Incremental Updates)
| File | Purpose |
|------|---------|
| `src/hooks/useRealtimeTasks.ts` | O(1) incremental task cache updates |
| `src/hooks/useRealtimeTeam.ts` | O(1) incremental team cache updates |

### Memoized Components
| File | Component | Comparison Function |
|------|-----------|---------------------|
| `src/components/scheduler/CalendarGrid.tsx` | `CalendarGridMemo` | Compares days, teamMembers, allTasks, readOnly |
| `src/components/scheduler/CalendarGrid.tsx` | `WorkerRow` | Compares workerId, workerName, days, readOnly |
| `src/components/scheduler/CalendarGrid.tsx` | `CalendarCell` | Compares workerId, dayIndex, readOnly, rowHeight |

### Optimized Data Flows
| File | Pattern | Description |
|------|---------|-------------|
| `src/components/scheduler/WeekView.tsx` | `workerDayTasksMap` | Pre-computed Map for O(1) task lookups |
| `src/main.tsx` | QueryClient config | 5-minute stale time, retry settings |

### Deleted Files (v0.3.0)
The following files were deleted and should NOT be recreated:
- `src/store/tasksStore.ts` - Replaced by React Query hooks
- `src/store/teamStore.ts` - Replaced by React Query hooks

---

## Related Directives
- [Code Standards](./code_standards.md) - Coding conventions
- [Project Overview](./project_overview.md) - Architecture overview
- [Troubleshooting](./troubleshooting.md) - Common issues
- [Changelog](./changelog.md) - Version history
