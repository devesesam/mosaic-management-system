# Performance Optimization Guide

## Overview
This document describes the performance optimization patterns used in the Mosaic Scheduler and how to maintain them for future development.

---

## Architecture: Realtime vs Polling

### Problem (Historical)
The app originally used **60-second polling** to keep data fresh. This caused:
- Visible "auto-refresh" jank every minute
- Unnecessary re-renders across the entire calendar
- Loading toasts ("Updating jobs...") interrupting user workflow
- Wasted bandwidth fetching unchanged data

### Solution: Supabase Realtime
The app now uses **Supabase Realtime subscriptions** instead of polling.

**How it works:**
1. `useRealtimeJobs()` and `useRealtimeTeam()` hooks subscribe to database changes
2. When ANY client modifies data, all connected clients receive the update instantly
3. Visibility API refreshes data when a tab becomes active (handles stale tabs)

**Key Files:**
- `src/hooks/useRealtimeJobs.ts` - Subscribes to `jobs` table changes
- `src/hooks/useRealtimeTeam.ts` - Subscribes to `workers` table changes
- `src/App.tsx` - Initializes realtime hooks and visibility refresh

**Usage:**
```typescript
// In App.tsx (already implemented)
import { useRealtimeJobs } from './hooks/useRealtimeJobs';
import { useRealtimeTeam } from './hooks/useRealtimeTeam';

function App() {
  // Subscribe to real-time updates
  useRealtimeJobs();
  useRealtimeTeam();

  // ... rest of component
}
```

### When to Add New Realtime Subscriptions
If you add a new table that needs real-time sync:

1. Create a new hook in `src/hooks/`:
```typescript
// src/hooks/useRealtimeCustomers.ts
import { useEffect, useRef } from 'react';
import { supabase } from '../api/supabaseClient';
import { useCustomersStore } from '../store/customersStore';
import { logger } from '../utils/logger';

export function useRealtimeCustomers() {
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const isSubscribedRef = useRef(false);

  useEffect(() => {
    if (isSubscribedRef.current) return;
    isSubscribedRef.current = true;

    subscriptionRef.current = supabase
      .channel('customers-realtime-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'customers'
      }, (payload) => {
        logger.debug('useRealtimeCustomers: Received change', payload.eventType);
        useCustomersStore.getState().fetchCustomers();
      })
      .subscribe();

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
      isSubscribedRef.current = false;
    };
  }, []);
}
```

2. Import and use in `App.tsx`

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

## Zustand Selector Patterns

### Problem: Over-subscription
When components destructure the entire store, they re-render on ANY store change:

```typescript
// BAD - re-renders when jobs, loading, error, or any action changes
const { jobs, loading, error, fetchJobs } = useJobsStore();
```

### Solution: Selectors
Use selectors to subscribe to specific state slices:

```typescript
// GOOD - only re-renders when jobs array changes
import { useJobs, useJobsLoading, useJobActions } from '../store/jobsStore';

const jobs = useJobs();
const loading = useJobsLoading();
const { fetchJobs, addJob } = useJobActions();
```

### Available Selectors

**jobsStore.ts:**
```typescript
export const useJobs = () => useJobsStore((state) => state.jobs);
export const useJobsLoading = () => useJobsStore((state) => state.isLoading);
export const useJobsError = () => useJobsStore((state) => state.error);
export const useSelectedJob = () => useJobsStore((state) => state.selectedJob);
export const useJobActions = () => useJobsStore((state) => ({
  fetchJobs: state.fetchJobs,
  addJob: state.addJob,
  updateJob: state.updateJob,
  deleteJob: state.deleteJob,
  setSelectedJob: state.setSelectedJob,
  unassignWorkerJobs: state.unassignWorkerJobs
}));
```

**teamStore.ts:**
```typescript
export const useTeamMembers = () => useTeamStore((state) => state.teamMembers);
export const useTeamLoading = () => useTeamStore((state) => state.isLoading);
export const useTeamError = () => useTeamStore((state) => state.error);
export const useTeamActions = () => useTeamStore((state) => ({
  fetchTeamMembers: state.fetchTeamMembers,
  addTeamMember: state.addTeamMember,
  updateTeamMember: state.updateTeamMember,
  deleteTeamMember: state.deleteTeamMember
}));
```

### Adding Selectors to New Stores
When creating a new Zustand store, always add selectors at the bottom:

```typescript
export const useMyStore = create<MyState>((set, get) => ({
  // ... store implementation
}));

// SELECTORS - Add these for optimized re-renders
export const useMyData = () => useMyStore((state) => state.data);
export const useMyLoading = () => useMyStore((state) => state.isLoading);
export const useMyActions = () => useMyStore((state) => ({
  fetchData: state.fetchData,
  updateData: state.updateData
}));
```

---

## Performance Checklist for New Features

### Before Implementation
- [ ] Will this component render frequently? → Consider React.memo
- [ ] Does this component filter large arrays? → Consider pre-computed maps
- [ ] Does this component use a Zustand store? → Use selectors, not destructuring

### During Implementation
- [ ] Avoid creating new objects/arrays in render (use useMemo/useCallback)
- [ ] Avoid inline function definitions for event handlers passed to memoized children
- [ ] Use stable keys for lists (not array index)

### After Implementation
- [ ] Test with React DevTools Profiler
- [ ] Check for unnecessary re-renders
- [ ] Verify bundle size hasn't increased significantly

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
| Slow initial load | Too many jobs fetched | Implement pagination |
| Jank every N seconds | Polling interval | Use realtime subscriptions |
| Component re-renders when unrelated data changes | Zustand over-subscription | Use selectors |

### Performance Monitoring
Check the console for these debug logs (when `VITE_LOG_LEVEL=debug`):
- `useRealtimeJobs: Subscription status` - Realtime connection health
- `App: Tab became visible, refreshing data` - Visibility API working
- `WeekView: Jobs loaded: N` - Data load confirmation

---

## Files Reference

### Realtime Hooks
| File | Purpose |
|------|---------|
| `src/hooks/useRealtimeJobs.ts` | Jobs table subscription |
| `src/hooks/useRealtimeTeam.ts` | Workers table subscription |

### Memoized Components
| File | Component | Comparison Function |
|------|-----------|---------------------|
| `src/components/scheduler/CalendarGrid.tsx` | `CalendarGridMemo` | Compares days, teamMembers, allJobs, readOnly |
| `src/components/scheduler/CalendarGrid.tsx` | `WorkerRow` | Compares workerId, workerName, days, readOnly, getWorkerDayJobs |
| `src/components/scheduler/CalendarGrid.tsx` | `CalendarCell` | Compares workerId, dayIndex, readOnly, rowHeight, day, renderingData |

### Optimized Data Flows
| File | Pattern | Description |
|------|---------|-------------|
| `src/components/scheduler/WeekView.tsx` | `workerDayJobsMap` | Pre-computed Map for O(1) job lookups |
| `src/store/jobsStore.ts` | Selectors | `useJobs`, `useJobsLoading`, `useJobActions` |
| `src/store/teamStore.ts` | Selectors | `useTeamMembers`, `useTeamLoading`, `useTeamActions` |

---

## Related Directives
- [Code Standards](./code_standards.md) - Coding conventions
- [Project Overview](./project_overview.md) - Architecture overview
- [Troubleshooting](./troubleshooting.md) - Common issues
