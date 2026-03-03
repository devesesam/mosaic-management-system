# Code Standards

## Overview
This document defines coding conventions, patterns, and best practices for the Mosaic Scheduler project.

---

## Naming Conventions

### Task Terminology (v0.2.0+)
As of version 0.2.0, the codebase uses "task" terminology consistently:

| Old Term | New Term | Notes |
|----------|----------|-------|
| Job | Task | All new code should use "Task" |
| JobStatus | TaskStatus | Enum with simplified values |
| jobsStore | tasksStore | Zustand store |
| useRealtimeJobs | useRealtimeTasks | Realtime hook |
| DraggableJob | DraggableTask | Calendar component |
| JobForm | TaskForm | Form component |

**Backwards Compatibility:** Legacy names are aliased for gradual migration:
```typescript
// These aliases exist but should not be used in new code
export type Job = Task;
export const useJobsStore = useTasksStore;
```

---

## TypeScript Standards

### Avoid `any` Type
Never use `any` in new code. Use proper types or `unknown` with type guards.

**Bad:**
```typescript
const handleSubmit = async (data: any) => { ... }
```

**Good:**
```typescript
const handleSubmit = async (data: Omit<Task, 'id' | 'created_at'>) => { ... }
```

### Use Type Imports
Import types separately when possible for clarity.

```typescript
import { Task, Worker, TaskStatus } from '../types';
```

### Define Interfaces for API Responses
```typescript
interface TasksResponse {
  data: Task[];
  count?: number;
  message?: string;
  success: boolean;
}
```

---

## Logging Standards

### Use the Logger Utility
All logging should go through `src/utils/logger.ts`. Never use `console.log` directly.

```typescript
import { logger } from '../utils/logger';

// Debug-level (only shows when VITE_LOG_LEVEL=debug)
logger.debug('Component: Action performed', data);

// Info-level (shows at info and debug)
logger.info('Component: Important event', data);

// Warning-level (shows at warn, info, debug)
logger.warn('Component: Potential issue', data);

// Error-level (always shows)
logger.error('Component: Error occurred', error);
```

### Logging Conventions
- Prefix with component/module name: `'AuthContext: Signing in...'`
- Include relevant data as second argument
- Use `debug` for verbose/trace information
- Use `info` for significant events
- Use `warn` for recoverable issues
- Use `error` for failures (always logged)

### Environment Configuration
- **Development**: Set `VITE_LOG_LEVEL=debug` in `.env`
- **Production**: Set `VITE_LOG_LEVEL=warn` in `.env`

---

## Data Fetching (React Query - v0.3.0+)

### ⚠️ Important: Zustand Stores Removed
As of v0.3.0, **Zustand stores have been deleted**. All data fetching uses React Query hooks.

### React Query Hooks Location
- Task hooks: `src/hooks/useTasks.ts`
- Team member hooks: `src/hooks/useTeamMembers.ts`

### Usage Pattern
```typescript
import { useTasksQuery, useAddTask, useUpdateTask, useDeleteTask } from '../hooks/useTasks';

// Reading data
const { data: tasks = [], isLoading, error, refetch } = useTasksQuery();

// Mutations
const addTaskMutation = useAddTask();
const updateTaskMutation = useUpdateTask();
const deleteTaskMutation = useDeleteTask();

// Creating a task
await addTaskMutation.mutateAsync(taskData);

// Updating a task
await updateTaskMutation.mutateAsync({ id: taskId, updates: { name: 'New Name' } });

// Deleting a task
await deleteTaskMutation.mutateAsync(taskId);
```

### Query Keys
Use the exported query key factories for cache management:
```typescript
import { taskKeys } from '../hooks/useTasks';
import { teamKeys } from '../hooks/useTeamMembers';

// Invalidate all task queries
queryClient.invalidateQueries({ queryKey: taskKeys.all });

// Invalidate team queries
queryClient.invalidateQueries({ queryKey: teamKeys.all });
```

### Optimistic Updates
React Query handles optimistic updates via `onMutate`. The hooks are pre-configured.

### Error Handling
Errors are returned via the query result. Handle them in components:
```typescript
const { error } = useTasksQuery();

if (error) {
  return <ErrorDisplay message={error.message} onRetry={refetch} />;
}
```

---

## Task Status Values

### Standard Status Enum
```typescript
export enum TaskStatus {
  NotStarted = 'Not Started',
  InProgress = 'In Progress',
  OnHold = 'On Hold',
  Completed = 'Completed'
}
```

### Usage in Components
```typescript
import { TaskStatus } from '../types';

// Setting status
const newTask = {
  ...taskData,
  status: TaskStatus.NotStarted
};

// Checking status
if (task.status === TaskStatus.Completed) {
  // Task is done
}
```

---

## Validation Standards (v0.3.0+)

### Primary: Zod Schema Validation
As of v0.3.0, use Zod schemas from `src/schemas/task.ts` for form validation:

```typescript
import { validateTaskForm } from '../schemas/task';

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  // Validate using Zod schema
  const validation = validateTaskForm(formData);
  if (!validation.success) {
    const firstError = Object.values(validation.errors)[0];
    toast.error(firstError || 'Please fix validation errors');
    return;
  }

  // Proceed with validated data
  await submitTask(validation.data);
};
```

### Zod Schema Benefits
- **Type inference**: `TaskFormData` type is inferred from schema
- **Custom refinements**: Cross-field validation (e.g., end_date >= start_date)
- **Clear error messages**: Each field has descriptive error messages
- **Automatic defaults**: Default values defined in schema

### Adding New Schemas
Create schemas in `src/schemas/` following this pattern:
```typescript
import { z } from 'zod';

export const myFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  // ... fields
});

export type MyFormData = z.infer<typeof myFormSchema>;

export function validateMyForm(data: unknown) {
  const result = myFormSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  // Convert Zod errors to simple key-value pairs
  const errors: Record<string, string> = {};
  for (const error of result.error.errors) {
    const path = error.path.join('.');
    if (!errors[path]) errors[path] = error.message;
  }
  return { success: false, errors };
}
```

### Legacy: Validation Utility
The `src/utils/validation.ts` validators are still available for simple checks:
- `validators.required(value)` - Non-empty check
- `validators.email(value)` - Email format
- `validators.phone(value)` - Phone format
- `validators.dateRange(start, end)` - End >= Start
- `validators.maxLength(max)(value)` - Character limit

---

## Error Handling Standards

### Use the Error Utility
```typescript
import { handleApiError, AppError, ErrorCodes } from '../utils/errors';

try {
  // API call
} catch (error) {
  const appError = handleApiError(error);
  if (appError.isRetryable) {
    // Implement retry logic
  }
  toast.error(appError.message);
}
```

### Error Codes
- `NETWORK_ERROR` - Connectivity issues (retryable)
- `TIMEOUT` - Request timeout (retryable)
- `UNAUTHORIZED` - Auth failure
- `NOT_FOUND` - Resource not found
- `SERVER_ERROR` - 500 errors (retryable)
- `VALIDATION_ERROR` - Input validation failure
- `UNKNOWN` - Unclassified errors

---

## Security Standards

### Admin Email Management
Admin emails are loaded from environment variables, not hardcoded.

```typescript
// In AuthContext.tsx:
const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS || '')
  .split(',')
  .map((e: string) => e.trim().toLowerCase())
  .filter(Boolean);
```

### Never Commit Secrets
- `.env` must be in `.gitignore`
- Use environment variables for all credentials
- Service keys should only be in Edge Functions (server-side)

### RLS Policies
Row Level Security should enforce:
- Authenticated users can read all data
- Only admin users can create/update/delete
- Admin status determined by `admin_users` table

---

## Brand & Styling Standards

### Use Brand Colors (Not Generic Tailwind Colors)

All UI elements must use the Mosaic brand colors defined in `tailwind.config.js`. Never use generic Tailwind colors like `indigo-*`, `blue-*` for primary UI elements.

**Bad:**
```typescript
<button className="bg-indigo-600 hover:bg-indigo-700">Submit</button>
<div className="focus:ring-indigo-500">...</div>
```

**Good:**
```typescript
<button className="bg-blueberry hover:bg-blueberry/90">Submit</button>
<div className="focus:ring-margaux">...</div>
```

### Brand Color Reference

| Color | Hex | Usage |
|-------|-----|-------|
| `garlic` | `#F9F8F1` | Page backgrounds |
| `aubergine` | `#3A4750` | Navbar, dark backgrounds |
| `margaux` | `#477296` | Focus states, links |
| `saffron` | `#B96129` | CTA buttons |
| `blueberry` | `#345981` | Primary buttons, default tiles |
| `vanilla` | `#F7F4E9` | Panel backgrounds |
| `charcoal` | `#333333` | Body text |
| `seafoam` | `#94B0B3` | Selection highlights |
| `sorbet` | `#E2C1A4` | Drop zones |

### Typography

Always use brand fonts for consistency:

```typescript
// Headlines and titles
<h2 className="font-bogart font-medium text-charcoal">Title</h2>

// Body text (default, no class needed)
<p className="text-charcoal">Body text</p>
```

### Common Patterns

```typescript
// Primary button
className="bg-blueberry hover:bg-blueberry/90 text-white"

// Focus state
className="focus:ring-margaux focus:border-margaux"

// Link styling
className="text-margaux hover:text-blueberry"

// Panel/card background
className="bg-vanilla"

// Page background
className="bg-garlic"
```

See [Brand Guidelines](./brand_guidelines.md) for complete reference.

---

## Component Patterns

### Form Components
```typescript
interface FormProps {
  onClose: () => void;
  onSubmit: (data: FormData) => Promise<void>;
  initialData?: ExistingData;
  readOnly?: boolean;
}

const MyForm: React.FC<FormProps> = ({ onClose, onSubmit, initialData, readOnly = false }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || readOnly) return;

    // Validation
    // Submit
  };

  return (
    // JSX
  );
};
```

### Loading States
Always handle loading states in components:
```typescript
if (loading) {
  return <LoadingSpinner />;
}

if (error) {
  return <ErrorDisplay error={error} onRetry={refetch} />;
}

return <Content data={data} />;
```

---

## File Organization

### Imports Order
1. React and external libraries
2. Internal components
3. Hooks and stores
4. Utilities
5. Types
6. Styles/CSS

```typescript
import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

import { Navbar } from './components/layout/Navbar';
import { useTasksStore } from './store/tasksStore';
import { logger } from './utils/logger';
import { Task, Worker } from './types';
```

### Component File Structure
```typescript
// 1. Imports
// 2. Types/Interfaces
// 3. Constants
// 4. Helper functions
// 5. Component definition
// 6. Export
```

---

## Dead Code Prevention

### Before Creating New Files
1. Check if similar functionality already exists
2. Search for existing utilities: `grep -r "functionName" src/`
3. Prefer extending existing files over creating new ones

### Naming Conventions to Avoid Confusion
- Use **plural** for collection stores: `tasksStore.ts` (not `taskStore.ts`)
- Use **consistent** naming: if API is `tasksApi.ts`, store should be `tasksStore.ts`
- Don't create parallel implementations (React Query hooks AND Zustand stores)

### When to Delete Files

**Required Verification Process:**
```bash
# Run BOTH of these searches - check ALL results
grep -r "from.*fileName" src/
grep -r "import.*FileName" src/
```

A file is dead code ONLY when:
1. It exports functions/components
2. **BOTH grep commands above return ZERO matches**
3. It's not the entry point (`main.tsx`, `index.html`)

**Always check ALL directories:** `src/store/`, `src/api/`, `src/context/`, `src/components/`, `src/hooks/`

### Debug Code Cleanup
Debug utilities (test modals, console inspectors) should:
1. Be deleted before merging to main
2. Or be conditionally included: `if (import.meta.env.DEV)`

### Verification After Deletions
Always run after removing files:
```bash
npm run build
```
If build succeeds, the deletion was safe.

---

## Data Fetching Pattern (v0.3.0+)

### Standard: React Query Hooks + Edge Functions
All data access uses React Query hooks, which call Edge Functions to interact with the database.

**Pattern:**
```
Component → useQuery/useMutation → fetch('/functions/v1/...') → Edge Function → Database
```

### Edge Function Naming
| Function | Method | Purpose |
|----------|--------|---------|
| `get-tasks` | GET | Fetch all tasks |
| `add-task` | POST | Create new task |
| `update-task` | PUT | Update existing task |
| `delete-task` | DELETE | Delete task |
| `get-tasks-by-worker` | GET | Fetch tasks for specific worker |

### Why This Pattern?
1. **Security**: Edge Functions run with Service Role permissions, bypassing RLS limitations for workers.
2. **Caching**: React Query automatically caches responses and deduplicates requests.
3. **Optimistic Updates**: Mutations update the cache immediately while API calls happen in background.
4. **Consistency**: Single source of truth for data access across the app.

### Rules for New Code
- **Always** use React Query hooks from `src/hooks/useTasks.ts` or `src/hooks/useTeamMembers.ts`
- **Never** make direct fetch calls in components
- **Never** recreate Zustand stores (they were deleted for a reason)
- **Never** use `supabase.from('table')` directly in components

---

## Routing (React Router v6)

### Route Configuration
Routes are defined in `src/App.tsx`:
```typescript
<Routes>
  <Route path="/week" element={<WeekView readOnly={!isEditable} />} />
  <Route path="/month" element={<MonthView readOnly={!isEditable} />} />
  <Route path="/" element={<Navigate to="/week" replace />} />
  <Route path="*" element={<Navigate to="/week" replace />} />
</Routes>
```

### Navigation
Use React Router hooks for navigation:
```typescript
import { useNavigate, useLocation } from 'react-router-dom';

function MyComponent() {
  const navigate = useNavigate();
  const location = useLocation();

  // Get current view from URL
  const activeView = location.pathname === '/month' ? 'month' : 'week';

  // Navigate to a route
  const handleViewChange = (view: 'week' | 'month') => {
    navigate(`/${view}`);
  };

  return <button onClick={() => handleViewChange('month')}>Month View</button>;
}
```

### Deep Linking
URLs are shareable. Users can bookmark or share links like:
- `https://app.example.com/week` - Week view
- `https://app.example.com/month` - Month view

---

## Error Boundaries

### Usage
Wrap critical UI sections with `ErrorBoundary`:
```typescript
import ErrorBoundary from './components/layout/ErrorBoundary';

<ErrorBoundary
  fallbackTitle="Calendar Error"
  fallbackMessage="The calendar view encountered an error. Try refreshing the page."
>
  <WeekView />
</ErrorBoundary>
```

### When to Use
- Wrap independent UI sections that could fail without crashing the whole app
- Wrap components that render external/user data
- Wrap complex interactive components (forms, calendars, modals)

---

## Performance Patterns

See [Performance Guide](./performance.md) for comprehensive documentation.

### React Query Caching (v0.3.0+)

React Query provides automatic caching and request deduplication:

```typescript
// Multiple components calling this = 1 network request
const { data: tasks } = useTasksQuery();
```

Configuration in `src/main.tsx`:
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

### Incremental Real-time Updates

Real-time updates use O(1) cache updates instead of O(n) full refetch:

```typescript
// In useRealtimeTasks.ts
queryClient.setQueryData<Task[]>(taskKeys.all, (old) => {
  if (!old) return [newTask];
  return [newTask, ...old]; // O(1) - just prepend
});
```

**Never** do this:
```typescript
// BAD - Full refetch on every change
refetch(); // This is O(n)
```

### React.memo for Calendar Components
Large components with many children should be memoized:

```typescript
const WorkerRow = React.memo(function WorkerRow({
  workerId,
  workerName,
  // ... props
}: WorkerRowProps) {
  // Component body
}, (prevProps, nextProps) => {
  // Return true if props are equal (no re-render needed)
  if (prevProps.workerId !== nextProps.workerId) return false;
  if (prevProps.readOnly !== nextProps.readOnly) return false;
  return true;
});
```

### Use Pre-computed Maps for O(1) Lookups
Instead of filtering arrays on every callback:

```typescript
// Pre-compute once per render
const workerDayTasksMap = React.useMemo(() => {
  const map = new Map<string, Task[]>();
  tasks.forEach(task => {
    const key = `${task.worker_id}-${dayKey}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(task);
  });
  return map;
}, [tasks]);

// O(1) lookup
const getTasks = (workerId: string, day: Date) => {
  return workerDayTasksMap.get(`${workerId}-${format(day, 'yyyy-MM-dd')}`) || [];
};
```

### Real-time Instead of Polling
Use Supabase Realtime subscriptions instead of polling:

```typescript
// In App.tsx
import { useRealtimeTasks } from './hooks/useRealtimeTasks';
import { useRealtimeTeam } from './hooks/useRealtimeTeam';

function App() {
  useRealtimeTasks();  // Subscribes to tasks table
  useRealtimeTeam();   // Subscribes to workers table
  // ...
}
```

**Never** re-add polling intervals. The app uses realtime subscriptions + visibility API refresh.

---

## Drag and Drop

### DnD Type Constants
Use `'TASK'` as the drag type for all task-related drag operations:

```typescript
const [{ isDragging }, drag] = useDrag({
  type: 'TASK',  // Not 'JOB' - use 'TASK' consistently
  item: { task },
  // ...
});

const [{ isOver }, drop] = useDrop({
  accept: 'TASK',
  // ...
});
```

---

## Migration Notes

### Migrating from "Job" to "Task" Terminology

If you encounter legacy code using "job" terminology:

1. **Check for aliases first** - The codebase provides backwards compatibility:
   ```typescript
   // These work but are deprecated
   import { Job } from '../types';  // Actually Task
   import { useJobsStore } from '../store/tasksStore';  // Actually useTasksStore
   ```

2. **Update imports** - Replace with new names:
   ```typescript
   // Old
   import { Job, JobStatus } from '../types';

   // New
   import { Task, TaskStatus } from '../types';
   ```

3. **Update component props** - Use consistent naming:
   ```typescript
   // Old
   interface Props { job: Job; onJobClick: (job: Job) => void; }

   // New
   interface Props { task: Task; onTaskClick: (task: Task) => void; }
   ```

4. **Update log messages** - Use "task" in logs:
   ```typescript
   logger.debug('tasksStore: Task created successfully:', task.id);
   ```
