# Troubleshooting Guide

Common issues, their causes, and solutions for the Mosaic Scheduler.

---

## Build & Development Issues

### Issue: TypeScript Compilation Errors

**Symptom:** `npm run build` fails with type errors

**Common Causes:**
1. Using `any` type (not allowed)
2. Missing type imports
3. Incorrect interface definitions

**Solutions:**
```typescript
// Bad: Using any
const handleSubmit = (data: any) => { ... }

// Good: Use proper types
const handleSubmit = (data: Omit<Job, 'id' | 'created_at'>) => { ... }
```

**Check:** Run `npx tsc --noEmit` to see all type errors

---

### Issue: Module Not Found

**Symptom:** `Cannot find module '../lib/supabase'` or similar

**Cause:** Importing from non-existent paths (legacy code)

**Solution:** Check the actual file paths:
- API functions: `../api/supabaseClient`
- Types: `../types` or `../../types`
- Utils: `../utils/logger`, `../utils/validation`, etc.

---

### Issue: Environment Variables Not Loading

**Symptom:** `import.meta.env.VITE_*` is undefined

**Causes:**
1. Variable not prefixed with `VITE_`
2. `.env` file not in project root
3. Server not restarted after adding variables

**Solutions:**
1. Ensure all frontend env vars start with `VITE_`
2. Verify `.env` is in the same directory as `package.json`
3. Restart the dev server: `npm run dev`

**Example `.env`:**
```bash
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_ADMIN_EMAILS=user@example.com
VITE_LOG_LEVEL=debug
```

---

## Authentication Issues

### Issue: User Cannot Edit (Read-Only Mode)

**Symptom:** User sees "read-only mode" banner, cannot create/edit jobs

**Cause:** User's email not in admin list

**Solutions:**
1. **Check Database (Primary):**
   - Run SQL in Supabase Dashboard to check/add admin:
   ```sql
   SELECT * FROM admin_users;
   -- If missing, insert your email:
   INSERT INTO admin_users (email) VALUES ('your@email.com');
   ```
2. **Check Environment Variable (Fallback):**
   - Ensure `VITE_ADMIN_EMAILS` includes your email (less reliable).
3. **Restart/Refresh:** 
   - Hard refresh the page to clear any cached state.

**Debug:** Check `VITE_LOG_LEVEL=debug` logs for "Auth: Admin status check".

---

### Issue: Login Fails with "Invalid Credentials"

**Symptom:** Correct password rejected

**Possible Causes:**
1. User doesn't exist in Supabase Auth
2. Password incorrect
3. Email not verified (if email confirmation enabled)

**Solutions:**
1. Check Supabase Auth dashboard for user
2. Use "Forgot Password" to reset
3. Check if email confirmation is required

---

### Issue: Session Not Persisting

**Symptom:** User logged out on page refresh

**Cause:** Session storage issues

**Solutions:**
1. Check browser localStorage for `supabase.auth.token`
2. Clear browser cache and re-login
3. Check Supabase project settings for session duration

---

## API & Data Issues

### Issue: Tasks/Workers Not Loading

**Symptom:** Empty lists, loading spinner stuck

**Debug Steps:**
1. Set `VITE_LOG_LEVEL=debug` in `.env`
2. Open browser console
3. Look for `[ERROR]` messages

**Common Causes:**
1. **Network Error:** Check internet connection
2. **CORS Error:** Edge Functions may have CORS issues
3. **Auth Error:** Anon key may be invalid

**Solutions:**
1. Verify Supabase URL and key in `.env`
2. Check Supabase dashboard for Edge Function errors
3. Test Edge Functions directly via Supabase dashboard

---

### Issue: Changes Not Reflecting

**Symptom:** Created/updated task doesn't appear

**Cause:** Usually stale state or failed API call

**Solutions:**
1. Check for error toasts
2. Refresh the page (or switch tabs to trigger visibility refresh)
3. Check browser console for errors - look for realtime subscription issues
4. Verify the operation succeeded in Supabase dashboard
5. Check if realtime subscriptions are connected (see "Realtime Updates Not Working")

---

### Issue: Duplicate Tasks/Workers Appearing

**Symptom:** Same item appears multiple times

**Cause:** Usually a state management bug or double-submit

**Solutions:**
1. Check if form submission button is disabled during submit
2. Look for race conditions in useEffect hooks
3. Clear state and refresh

---

## UI Feature Issues

### Issue: Tasks "Disappearing" After Creation (FIXED in v0.1.7)

**Symptom:** Creating a task with a team member assigned but no start date results in the task not appearing anywhere.

**Root Cause:** Prior to v0.1.7, the "Tasks to Schedule" panel required tasks to have BOTH no start date AND no worker. Tasks with workers but no dates fell through the cracks.

**Status:** ✅ Fixed in v0.1.7

**Current Behavior:** Tasks appear in "Tasks to Schedule" if they have no start date, regardless of worker assignment.

**If this issue reappears:**
1. Check `UnscheduledPanel.tsx` line ~42
2. Verify filter is `!task.start_date` (not `!task.start_date && !task.worker_id`)

---

### Issue: Global Search Not Finding Tasks

**Symptom:** Typing in search bar shows no results

**Possible Causes:**
1. Tasks array is empty
2. Search term doesn't match task name or notes
3. Component not receiving tasks prop

**Debug Steps:**
1. Open browser console
2. Check if tasks are loaded (look for `Tasks loaded: N` messages)
3. Verify search matches expected fields

**Solutions:**
1. Ensure tasks are loaded before searching
2. Check spelling in search term
3. Verify `tasks` prop is passed to `GlobalTaskSearch`

---

### Issue: Tasks Pane Won't Collapse/Expand

**Symptom:** Clicking collapse button does nothing

**Possible Causes:**
1. `onToggleCollapse` prop not passed
2. localStorage not accessible
3. State not updating

**Solutions:**
1. Verify `onToggleCollapse={toggleTasksPane}` in WeekView/MonthView
2. Try clearing localStorage: `localStorage.removeItem('tasksPaneCollapsed')`
3. Check for console errors during click

---

### Issue: Edit Worker Not Saving

**Symptom:** Click save, nothing happens or error toast appears

**Possible Causes:**
1. `update-worker` edge function not deployed
2. Network request failing
3. Invalid worker data

**Debug Steps:**
1. Open Network tab in DevTools
2. Look for PUT request to `/functions/v1/update-worker`
3. Check response for error messages

**Solutions:**
1. Deploy edge function: `supabase functions deploy update-worker`
2. Check Supabase logs for function errors
3. Verify worker name is not empty

---

### Issue: Mobile Layout Broken

**Symptom:** Elements overlapping or extending off screen on mobile

**Possible Causes:**
1. Fixed widths not becoming responsive
2. Z-index conflicts
3. Missing responsive classes

**Debug Steps:**
1. Open DevTools responsive mode
2. Set width to 375px (iPhone SE)
3. Check if elements have responsive classes

**Solutions:**
1. Verify responsive classes: `w-24 sm:w-32 md:w-48`
2. Check if Jobs pane is hidden: `hidden md:flex`
3. Ensure search dropdown has proper z-index (50)

---

### Issue: Search Dropdown Behind Other Elements

**Symptom:** Search results appear but are hidden behind calendar

**Cause:** Z-index lower than other elements

**Solution:**
Verify `GlobalJobSearch` dropdown has:
```tsx
className="absolute z-50 ..."
```

---

### Issue: Collapse State Not Persisting

**Symptom:** Jobs pane resets to expanded on page refresh

**Cause:** localStorage not being read on mount

**Solution:**
Verify state initialization:
```tsx
const [isJobsPaneCollapsed, setIsJobsPaneCollapsed] = useState(() => {
  return localStorage.getItem('jobsPaneCollapsed') === 'true';
});
```

---

### Issue: Team Member Rows in Wrong Order

**Symptom:** Team member rows appear in unexpected order in Week View

**Expected Order (as of v0.1.7):**
1. Master Row (always first)
2. Logged-in user's row
3. Unassigned row
4. Other team members (alphabetical)

**Possible Causes:**
1. `currentWorker` not being detected from `useAuth()`
2. User not logged in / no matching team member profile
3. Filter dropdown selecting specific member

**Debug Steps:**
1. Check browser console for `CalendarGrid: Team Members:` log
2. Verify `currentWorker` is not null in AuthContext
3. Check if dropdown is set to "All Team" vs a specific member

**Solution:**
Check `CalendarGrid.tsx`:
- Verify `useAuth()` import exists
- Verify `currentUserMember` and `otherMembers` computed values
- Verify rendering order in JSX: currentUserMember first, then Unassigned, then otherMembers

---

## Migration Issues (v0.3.0)

### Issue: Import Error for Zustand Stores

**Symptom:** `Cannot find module '../store/tasksStore'` or similar

**Cause:** Zustand stores were deleted in v0.3.0. The codebase now uses React Query hooks.

**Solution:**
```typescript
// OLD (v0.2.x) - No longer works
import { useTasksStore } from '../store/tasksStore';
const { tasks, fetchTasks, addTask } = useTasksStore();

// NEW (v0.3.0) - Use React Query hooks
import { useTasksQuery, useAddTask } from '../hooks/useTasks';
const { data: tasks = [], isLoading } = useTasksQuery();
const addTaskMutation = useAddTask();
// To add: await addTaskMutation.mutateAsync(taskData);
```

---

### Issue: Form Validation Not Working

**Symptom:** Form submits with invalid data, or validation errors don't show

**Cause:** Not using Zod schema validation

**Solution:**
```typescript
import { validateTaskForm } from '../schemas/task';

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  const validation = validateTaskForm(formData);
  if (!validation.success) {
    toast.error(Object.values(validation.errors)[0]);
    return;
  }

  await submitTask(validation.data);
};
```

---

### Issue: Routes Not Working / 404 on Refresh

**Symptom:** Direct URL access shows 404, or browser back/forward doesn't work

**Cause:** Server not configured for SPA routing

**Solution:**
1. **Netlify**: Add `_redirects` file with `/* /index.html 200`
2. **Vercel**: Configure `vercel.json` with rewrite rules
3. **Local dev**: Vite handles this automatically

---

### Issue: React Query Cache Stale

**Symptom:** Data doesn't update after mutation

**Cause:** Cache not being invalidated properly

**Solution:**
Mutations should invalidate queries:
```typescript
const addTaskMutation = useMutation({
  mutationFn: addTaskApi,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: taskKeys.all });
  },
});
```

Check that `src/hooks/useTasks.ts` has proper `onSuccess` handlers.

---

### Issue: Error Boundary Not Catching Errors

**Symptom:** White screen crash instead of fallback UI

**Cause:** Error occurring outside of Error Boundary, or in async code

**Solution:**
1. Ensure Error Boundary wraps the failing component
2. Error Boundaries don't catch errors in:
   - Event handlers (use try/catch)
   - Async code (use try/catch)
   - Server-side rendering
   - Errors in the Error Boundary itself

---

### Issue: "Calendar Error" After Login (Hook Ordering)

**Symptom:** Error Boundary shows "Calendar Error" immediately after logging in

**Cause:** React hooks called in wrong order - `useAuth()` called after `useTasksQuery()`, so `currentWorker` is undefined when used in the query.

**Solution:**
In calendar view components (`WeekView.tsx`, `MonthView.tsx`), ensure `useAuth()` is called BEFORE `useTasksQuery()`:

```typescript
// CORRECT - useAuth first
const { user, currentWorker } = useAuth();
const { data: tasks } = useTasksQuery(currentWorker?.id, false);

// WRONG - useAuth after query
const { data: tasks } = useTasksQuery(currentWorker?.id, false); // currentWorker is undefined!
const { user, currentWorker } = useAuth();
```

**Files to check:**
- `src/components/scheduler/WeekView.tsx`
- `src/components/scheduler/MonthView.tsx`

---

### Issue: Real-time Updates Not Appearing (Cache Key Mismatch) - RESOLVED v0.3.2

**Symptom:** Changes made by other users don't appear until manual refresh.

**Historical Context:** In v0.3.1, we attempted to fix this by changing `setQueryData` to `invalidateQueries`. However, this introduced complexity with visibility filtering (private tasks) that couldn't be reliably handled in real-time.

**Final Solution (v0.3.2):** Real-time subscriptions for tasks are now **disabled entirely**.

**Why this is the right approach:**
1. Your own changes are instant via optimistic updates
2. Other users' changes appear when you refresh or switch tabs
3. The tab visibility handler in `App.tsx` automatically refetches data when you return
4. Private task filtering requires server-side processing that real-time can't replicate

**Current architecture:**
```typescript
// src/hooks/useRealtimeTasks.ts - Now a no-op
export function useRealtimeTasks() {
  // No-op - real-time disabled for simplicity
}

// src/hooks/useTasks.ts - Single query key for optimistic updates
export const taskKeys = {
  all: ['tasks'] as const,
};

// src/App.tsx - Tab visibility refreshes data
useEffect(() => {
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
    }
  };
  document.addEventListener('visibilitychange', handleVisibilityChange);
  return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
}, [queryClient]);
```

**If you need real-time for tasks in the future:**
Real-time would require either:
1. Server-side filtering in the Edge Function for each real-time event (complex)
2. Disabling the visibility feature (loss of functionality)
3. Using invalidation and accepting the refetch cost (what v0.3.1 did)

For now, the simpler approach of relying on tab visibility refresh is sufficient.

---

## Migration Issues (v0.2.0 & v0.2.1)

### Issue: Month View White Screen Crash

**Symptom:** Clicking the Month View or opening the Team manage modals causes a complete React app crash (white screen).

**Cause:** These components were missed during the `jobs` to `tasks` migration and are still attempting to use the deprecated `useJobsStore` and `Job` types.

**Solution:**
Refactor the components to use `useTasksStore` and `Task` types. Update all variable casing (e.g., `jobsError` -> `tasksError`). Additionally, delete any leftover `*Job*.tsx` components to prevent them from being imported by accident.

---

### Issue: Private Tasks Disappearing from Master Calendar

**Symptom:** A task set to "Private" correctly shows up in WeekView, but vanishes when navigating to MonthView (or vice-versa), and disappears from both upon return.

**Root Cause:** The `WeekView` or `MonthView` components are making isolated, duplicate calls to `fetchTasks()` locally on mount. Because these local fetches don't pass the logged-in user's context (e.g., `workerId`), the backend Edge Function treats the request as "anonymous" and strips out all private tasks.

**Solution:** Data fetching should happen globally in `App.tsx` where the `currentWorker` context is available. Remove duplicate `useEffect` fetching blocks from the individual calendar view components:

```tsx
// ❌ BAD: Don't fetch tasks inside the views without context!
useEffect(() => {
  fetchTasks();
}, [fetchTasks]);

// ✅ GOOD: Rely on App.tsx to fetch the global state, ensuring `fetchTasks(workerId)` preserves visibility permissions.
```

---

### Issue: "Table 'jobs' does not exist" Error

**Symptom:** API calls fail with table not found errors after migration

**Cause:** Database migration applied but edge functions still reference old table names

**Solutions:**
1. Deploy new edge functions:
   ```bash
   supabase functions deploy get-tasks
   supabase functions deploy add-task
   supabase functions deploy update-task
   supabase functions deploy delete-task
   supabase functions deploy get-tasks-by-worker
   ```

2. Update frontend to use new endpoints (check `tasksStore.ts`)

---

### Issue: App Shows "Error Loading Data" After Migration

**Symptom:** The main app viewport immediately shows a "Error Loading Data" banner and prompts a refresh, crashing the schedule view.

**Cause:** The frontend `App.tsx` boundary is catching a fetch failure from the new `tasksStore`. The edge functions like `get-tasks` were not properly deployed to Supabase after the database migration, returning 404s.

**Solution:**
Deploy the new edge functions manually, bypassing JWT if executing locally via a test environment:
```bash
supabase functions deploy get-tasks --no-verify-jwt
supabase functions deploy add-task --no-verify-jwt
supabase functions deploy update-task --no-verify-jwt
supabase functions deploy delete-task --no-verify-jwt
supabase functions deploy get-tasks-by-worker --no-verify-jwt
```

---

### Issue: "Column 'address' does not exist" Error

**Symptom:** Task creation/updates fail after migration

**Cause:** Code still referencing old `address` column instead of `name`

**Solution:**
1. Check that `TaskForm.tsx` uses `formData.name` not `formData.address`
2. Check edge function code references `name` column
3. Verify database migration was applied:
   ```sql
   SELECT column_name FROM information_schema.columns
   WHERE table_name = 'tasks';
   -- Should show 'name', not 'address'
   ```

---

### Issue: Tasks Have Wrong Status After Migration

**Symptom:** All tasks show unexpected status values

**Cause:** Status migration in SQL didn't map all values correctly

**Solution:**
Run manual status fix if needed:
```sql
-- Check current status values
SELECT DISTINCT status FROM tasks;

-- Fix any unmapped values
UPDATE tasks SET status = 'Not Started'
WHERE status NOT IN ('Not Started', 'In Progress', 'On Hold', 'Completed');
```

---

### Issue: Secondary Workers Not Loading

**Symptom:** Tasks don't show additional team members assigned

**Cause:** Edge functions still querying `job_secondary_workers` instead of `task_secondary_workers`

**Solution:**
1. Check edge function code uses `task_secondary_workers` table
2. Check edge function uses `task_id` column (not `job_id`)
3. Redeploy affected edge functions

---

### Issue: Legacy "Job" Imports Failing

**Symptom:** TypeScript errors about missing `Job` type or `useJobsStore`

**Cause:** Backwards compatibility aliases not being found

**Solution:**
The aliases should exist in these files:
```typescript
// src/types/index.ts
export type Job = Task;

// src/store/tasksStore.ts
export const useJobsStore = useTasksStore;
```

If missing, either:
1. Add the aliases back
2. Update imports to use new names (`Task`, `useTasksStore`)

---

### Issue: Drag Type Mismatch

**Symptom:** Drag and drop not working, tasks won't drag or drop

**Cause:** Inconsistent drag type between components (some using 'JOB', some using 'TASK')

**Solution:**
All drag/drop components must use the same type string:
```typescript
// In DraggableTask.tsx
const [{ isDragging }, drag] = useDrag({
  type: 'TASK',  // Must match
  ...
});

// In CalendarCell.tsx, UnscheduledPanel.tsx, etc.
const [{ isOver }, drop] = useDrop({
  accept: 'TASK',  // Must match
  ...
});
```

Search for inconsistent types:
```bash
grep -r "type: 'JOB'" src/
grep -r "accept: 'JOB'" src/
# Should return no results
```

---

### Issue: Real-time Updates Not Working After Migration

**Symptom:** Changes in one browser don't appear in another

**Cause:** Realtime subscription still watching `jobs` table instead of `tasks`

**Solution:**
Check `src/hooks/useRealtimeTasks.ts`:
```typescript
const channel = supabase
  .channel('tasks-realtime-changes')
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'tasks' },  // Must be 'tasks'
    handleChange
  )
  .subscribe();
```

Also verify Supabase Dashboard:
1. Go to Database > Replication
2. Ensure `tasks` table has replication enabled

---

## Brand & Styling Issues

### Issue: Brand Colors Not Showing After Deployment

**Symptom:** Colors still look like old indigo/blue colors after pushing to GitHub

**Possible Causes:**
1. Browser cache not cleared
2. Deployment not rebuilt
3. Some files still have old color classes

**Solutions:**

1. **Clear Browser Cache:**
   ```
   Windows/Linux: Ctrl+Shift+R
   Mac: Cmd+Shift+R
   ```

2. **Force Deployment Rebuild:**
   - Check your hosting provider (Netlify/Vercel) for rebuild status
   - Trigger manual rebuild if needed

3. **Verify All Files Updated:**
   ```bash
   # Search for any remaining old colors
   grep -r "indigo-" src/
   grep -r "#0a2342" src/

   # Should return: No matches found
   ```

**Files Commonly Missed During Brand Updates:**
- `MasterRow.tsx` - Master View row styling
- `WorkerManageModal.tsx` - Edit modal inputs
- `DayJobsModal.tsx` - Day view modal
- `CalendarCell.tsx` - Calendar cell highlights

---

### Issue: Bogart Font Not Loading

**Symptom:** Headlines appear in system font instead of Bogart

**Possible Causes:**
1. Font files missing from `src/assets/fonts/`
2. @font-face declarations incorrect in `index.css`
3. Font paths incorrect in CSS

**Solutions:**

1. **Verify Font Files Exist:**
   ```bash
   ls src/assets/fonts/
   # Should show:
   # bogart-medium.ttf
   # bogart-regular.ttf
   ```

2. **Check CSS Font Loading:**
   ```css
   /* In src/index.css - verify these exist */
   @font-face {
     font-family: 'Bogart';
     src: url('./assets/fonts/bogart-medium.ttf') format('truetype');
     font-weight: 500;
     font-style: normal;
     font-display: swap;
   }
   ```

3. **Check DevTools Network Tab:**
   - Look for 404 errors on .ttf files
   - Verify fonts are being requested

4. **Verify Tailwind Config:**
   ```javascript
   // In tailwind.config.js
   fontFamily: {
     'bogart': ['Bogart', 'Georgia', 'serif'],
   }
   ```

---

### Issue: Task Tiles Have Wrong Default Color

**Symptom:** New task tiles appear with old blue color instead of Blueberry

**Cause:** Default color not updated in `TaskTile.tsx`

**Solution:**

Check `src/components/tasks/TaskTile.tsx`:
```typescript
// Line ~23 - should be:
return task.status === TaskStatus.Completed ? '#94a3b8' : (task.tile_color || '#345981');
//                                                                            ^^^^^^^^
//                                                                         Blueberry hex
```

---

### Issue: Focus Rings Wrong Color

**Symptom:** Input focus rings are blue/indigo instead of Margaux

**Cause:** Old `focus:ring-indigo-500` classes not updated

**Solution:**

Search and replace in affected files:
```bash
# Find files with old focus colors
grep -r "focus:ring-indigo" src/
grep -r "focus:border-indigo" src/

# Update to:
focus:ring-margaux focus:border-margaux
```

---

### Issue: Colors Look Different in Production vs Dev

**Symptom:** Colors render differently between environments

**Possible Causes:**
1. CSS not being purged correctly
2. Different Tailwind builds
3. CDN caching old CSS

**Solutions:**

1. **Rebuild Production:**
   ```bash
   npm run build
   # Check dist/assets/*.css for correct color values
   ```

2. **Verify Colors in Built CSS:**
   ```bash
   # Search for brand colors in built CSS
   grep -o "#345981" dist/assets/*.css  # Should find blueberry
   grep -o "#477296" dist/assets/*.css  # Should find margaux
   ```

3. **Clear CDN Cache:**
   - Netlify: Site settings > Build & deploy > Clear cache and deploy site
   - Vercel: Deployments > Redeploy

---

## Performance Issues

See [Performance Guide](./performance.md) for comprehensive optimization documentation.

### Issue: Slow Initial Load

**Symptom:** Long delay before data appears

**Causes:**
1. Large dataset
2. Cold start for Edge Functions
3. Network latency

**Solutions:**
1. Edge Functions have cold start delay (~1-2s first request)
2. Consider adding pagination for large datasets
3. Check network tab for slow requests

---

### Issue: UI Lag When Dragging Tasks

**Symptom:** Stuttering during drag-and-drop

**Causes:**
1. Missing React.memo on calendar components
2. Zustand over-subscription (using full store instead of selectors)
3. O(n) filtering on every callback

**Solutions:**
1. Verify components are memoized: `CalendarGrid`, `WorkerRow`, `CalendarCell`
2. Use Zustand selectors: `useTasks()` instead of destructuring `useTasksStore()`
3. Use pre-computed maps for task lookups (see `workerDayTasksMap` in WeekView)
4. Use React DevTools Profiler to identify bottlenecks

---

### Issue: Data Refreshing Every 60 Seconds (Legacy)

**Symptom:** Calendar re-renders periodically, showing loading toasts

**NOTE:** This was fixed in v0.1.5. The app now uses realtime subscriptions.

**If this issue reappears:**
1. Check that `useRealtimeTasks()` and `useRealtimeTeam()` are called in App.tsx
2. Verify no `setInterval` for polling exists
3. Check Supabase realtime connection in console logs

**Current Architecture:**
- Realtime subscriptions notify of changes
- Visibility API refreshes when tab becomes active
- No periodic polling

---

### Issue: Realtime Updates Not Working

**Symptom:** Changes made in one browser don't appear in another

**Causes:**
1. Realtime subscription not connected
2. Supabase realtime disabled for table
3. Network issues

**Debug:**
1. Set `VITE_LOG_LEVEL=debug`
2. Look for `useRealtimeJobs: Subscription status` in console
3. Check Supabase Dashboard > Realtime for connection status

**Solutions:**
1. Verify realtime hooks are called in App.tsx
2. Enable realtime for tables in Supabase Dashboard > Database > Replication
3. Check browser network tab for WebSocket connection

---

### Issue: Components Re-rendering Too Often

**Symptom:** Slow UI, high CPU usage during interactions

**Debug:**
1. Install React DevTools browser extension
2. Open Profiler tab
3. Record while performing slow action
4. Look for components with many re-renders

**Common Causes:**
1. Not using Zustand selectors
2. Missing React.memo on list components
3. Creating new objects/functions in render

**Solutions:**
```typescript
// BAD: Re-renders on any store change
const { tasks, loading } = useTasksStore();

// GOOD: Only re-renders when tasks change
const tasks = useTasks();
const loading = useTasksLoading();
```

---

## Database Issues

### Issue: RLS Policy Blocking Operations

**Symptom:** "permission denied for table" errors

**Cause:** Row Level Security policies preventing access

**Solutions:**
1. Ensure user is authenticated
2. Check if user's email is in `admin_users` table
3. Review RLS policies in Supabase dashboard

**Debug:**
```sql
-- Check if user is admin
SELECT * FROM admin_users WHERE email = 'user@example.com';

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'jobs';
```

---

### Issue: Migration Failed

**Symptom:** `supabase db push` errors

**Common Causes:**
1. Syntax error in SQL
2. Conflicting policy names
3. Table doesn't exist

**Solutions:**
1. Check migration file for syntax errors
2. Use `DROP POLICY IF EXISTS` before `CREATE POLICY`
3. Ensure tables are created before policies

---

## Logging Issues

### Issue: No Console Output

**Symptom:** No debug messages in console

**Cause:** `VITE_LOG_LEVEL` set too high

**Solution:**
```bash
# In .env
VITE_LOG_LEVEL=debug
```

Restart the dev server after changing.

---

### Issue: Too Much Console Output

**Symptom:** Console flooded with messages

**Solution:**
```bash
# In .env
VITE_LOG_LEVEL=warn  # Only warnings and errors
# OR
VITE_LOG_LEVEL=error # Only errors
```

---

## Codebase Maintenance Issues

### Issue: Suspected Dead Code

**Symptom:** Files exist but don't seem to be used

**CRITICAL - How to Verify Properly:**

⚠️ **WARNING:** A previous agent made a mistake here by only checking some files. You MUST run a comprehensive search across ALL files.

```bash
# CORRECT: Search for ALL imports of a file across entire src/
grep -r "from.*jobsApi" src/
grep -r "from.*workersApi" src/

# WRONG: Only checking a few "likely" files and assuming the rest
```

**The Trap:** In this codebase, the Zustand stores use Edge Functions, but other files (AuthContext, WorkerManageModal) still use the direct API layer. Checking only the stores will give you a false "this is dead code" result.

**Common Dead Code Patterns:**
1. **Debug modals** - Created during development, never wired to UI
2. **Abandoned hooks** - React Query hooks when app uses Zustand
3. **Parallel stores** - Multiple stores for same data (e.g., `jobStore.ts` vs `jobsStore.ts`)
4. **Unused API layers** - API files that nothing imports

**Safe Deletion Process:**
1. **Run comprehensive grep** for ALL imports (not just likely files)
2. Check `src/context/`, `src/components/`, `src/hooks/` - not just `src/store/`
3. If truly 0 imports → file never runs
4. Delete the file
5. Run `npm run build` to verify no breakage
6. Document in changelog

**Lesson Learned (2026-02-12):** An agent incorrectly identified `jobsApi.ts` and `workersApi.ts` as dead code because the stores don't use them. But `AuthContext.tsx` and `WorkerManageModal.tsx` DO import from these files. Deleting them would have broken login. Always run the full grep.

---

### Issue: Edge Function Authorization
**Symptom:** 401/403 errors when fetching data

**Cause:**
Edge Functions use a Service Role key to bypass RLS. If this key is missing or invalid in the Supabase dashboard secrets, the function will fail.

**Solutions:**
1. Check Supabase Dashboard > Edge Functions > Secrets
2. Ensure `SUPABASE_SERVICE_ROLE_KEY` is set
3. Check function logs for permission errors

### Legacy Architecture Note
(Resolved 2026-02-12) The "Mixed Data Pattern" issue where some components used direct API calls has been fixed.
- `tasksApi.ts` and `workersApi.ts` are deleted.
- All data access now goes through Zustand Stores → Edge Functions.
- If you see `supabase.from('table')` in component code, it is incorrect and should be refactored to use a Store.

### Legacy Terminology Note
(Updated 2026-03-03) The codebase was refactored from "job" to "task" terminology in v0.2.0.
- Old "job" imports still work via backwards compatibility aliases
- New code should always use "task" terminology
- See [Changelog v0.2.0](./changelog.md) for full migration details

---

### Issue: bolt.new Artifacts

**Symptom:** `.bolt/` directory exists with old template files

**What's Inside:**
- `config.json` - Template identifier (e.g., `bolt-vite-react-ts`)
- `prompt` - Original bolt.new prompt used to generate project
- `supabase_discarded_migrations/` - **Many abandoned SQL files**

**Why It's a Problem:**
- Clutters the project with unused files
- Discarded migrations can be confusing
- Takes up space in version control

**Solution:**
```bash
# Safe to delete entire directory
rm -rf .bolt/
```

---

### Issue: Unused npm Dependencies

**Symptom:** `package.json` has packages that aren't imported

**How to Check:**
```bash
# Search for imports of a package
grep -r "from 'packagename'" src/
grep -r "require('packagename')" src/
```

**Common Unused Packages from bolt.new:**
| Package | Why Unused | Alternative |
|---------|-----------|-------------|
| `dotenv` | Vite uses `import.meta.env` | Native Vite |
| Duplicate UI libraries | Multiple installed, one used | Keep the used one |

**Removal Process:**
```bash
# Remove from package.json, then:
npm install
npm run build  # Verify no breakage
```

---

## Quick Diagnostics Checklist

When something isn't working:

- [ ] Check browser console for errors (F12 → Console)
- [ ] Check network tab for failed requests (F12 → Network)
- [ ] Set `VITE_LOG_LEVEL=debug` and restart
- [ ] Verify `.env` variables are set correctly
- [ ] Try logging out and back in
- [ ] Clear browser cache and localStorage
- [ ] Check Supabase dashboard for errors
- [ ] Run `npm run build` to check for TypeScript errors

---

## Getting Help

If issues persist:

1. **Check Directives:** Review relevant directive files
2. **Search Codebase:** Use grep/search for error messages
3. **Supabase Docs:** https://supabase.com/docs
4. **React DnD Docs:** https://react-dnd.github.io/react-dnd/
5. **Zustand Docs:** https://github.com/pmndrs/zustand

---

## Reporting Issues

When reporting an issue, include:

1. **Steps to reproduce**
2. **Expected behavior**
3. **Actual behavior**
4. **Console errors** (copy full error)
5. **Browser and OS**
6. **Screenshots** (if UI issue)
