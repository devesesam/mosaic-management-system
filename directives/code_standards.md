# Code Standards

## Overview
This document defines coding conventions, patterns, and best practices for the Mosaic Scheduler project.

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
const handleSubmit = async (data: Omit<Job, 'id' | 'created_at'>) => { ... }
```

### Use Type Imports
Import types separately when possible for clarity.

```typescript
import { Job, Worker } from '../types';
```

### Define Interfaces for API Responses
```typescript
interface WorkersResponse {
  data: Worker[];
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

## State Management (Zustand)

### Store Naming
- Use plural for collection stores: `jobsStore.ts`, `workersStore.ts`
- Export hook with `use` prefix: `useJobsStore`, `useWorkerStore`

### Optimistic Updates
Update local state immediately, don't refetch after mutations.

**Bad:**
```typescript
set((state) => ({ jobs: [...state.jobs, newJob] }));
get().fetchJobs(); // Unnecessary refetch
```

**Good:**
```typescript
set((state) => ({ jobs: [...state.jobs, newJob] }));
// Trust the local state, no refetch needed
```

### Error Handling in Stores
```typescript
try {
  // API call
} catch (error) {
  logger.error('storeName: Error performing action:', error);
  const errorMessage = error instanceof Error
    ? error.message
    : 'Default error message';
  set({ error: errorMessage, loading: false });
  toast.error(errorMessage);
  throw error; // Re-throw for caller handling
}
```

---

## Validation Standards

### Use the Validation Utility
All form validation should use `src/utils/validation.ts`.

```typescript
import { validators } from '../utils/validation';

// In submit handler:
if (!validators.required(formData.address)) {
  toast.error('Job address is required');
  return;
}

const dateError = validators.dateRange(formData.start_date, formData.end_date);
if (dateError) {
  toast.error(dateError);
  return;
}
```

### Available Validators
- `validators.required(value)` - Non-empty check
- `validators.email(value)` - Email format
- `validators.phone(value)` - Phone format (digits, +, -, spaces, parentheses)
- `validators.dateRange(start, end)` - End >= Start
- `validators.maxLength(max)(value)` - Character limit
- `validators.minLength(min)(value)` - Minimum length

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
import { useJobsStore } from './store/jobsStore';
import { logger } from './utils/logger';
import { Job, Worker } from './types';
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
- Use **plural** for collection stores: `jobsStore.ts` (not `jobStore.ts`)
- Use **consistent** naming: if API is `jobsApi.ts`, store should be `jobsStore.ts`
- Don't create parallel implementations (React Query hooks AND Zustand stores)

### When to Delete Files

⚠️ **CRITICAL WARNING:** A previous agent (2026-02-12) incorrectly identified files as dead code by only checking some directories. This would have broken the app.

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

**Common Mistake:** Checking only `src/store/` and assuming that's representative. In this codebase:
- Stores use Edge Functions
- BUT `src/context/AuthContext.tsx` uses the direct API layer
- BUT `src/components/scheduler/WorkerManageModal.tsx` uses the direct API layer

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

## Data Fetching Pattern

### Standard: Zustand Stores + Edge Functions
All data access must go through the Zustand stores, which use Edge Functions to interact with the database.

**Pattern:**
```
Component → useStore() → fetch('/functions/v1/...') → Edge Function → Database
```

### Why This Pattern?
1.  **Security**: Edge Functions run with Service Role permissions, bypassing RLS limitations for workers.
2.  **Consistency**: A single way to fetch/update data across the app.
3.  **State Management**: Zustand handles local state updates optimistically.

### Legacy Code Removed
The old "Direct Supabase Client" pattern (`src/api/jobsApi.ts`, etc.) has been removed. 
**Do NOT re-introduce direct `supabase.from('table')` calls in components.**

### Rules for New Code
- **Always** use `useJobsStore` or `useWorkerStore`.
- **Never** make direct API calls in components.
- **Never** add React Query hooks (we use Zustand).
