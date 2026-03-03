# Changelog

All notable changes to the Mosaic Scheduler project are documented in this file.

---

## [0.2.0] - 2026-03-03 - Major Refactoring: Jobs to Tasks

### Overview
Complete refactoring of the application from "roofing job scheduler" to "generic task scheduler". This is a breaking change that renames tables, columns, components, and removes all roofing-specific fields.

### Breaking Changes

#### Database Schema
- **Table Renamed:** `jobs` → `tasks`
- **Table Renamed:** `job_secondary_workers` → `task_secondary_workers`
- **Column Renamed:** `address` → `name` (in tasks table)
- **Column Renamed:** `job_id` → `task_id` (in task_secondary_workers table)

#### Removed Columns (roofing-specific)
| Column | Purpose (Legacy) |
|--------|------------------|
| `customer_name` | Customer contact |
| `quote_number` | Quote reference |
| `fascia_colour` | Fascia color spec |
| `spouting_colour` | Spouting color spec |
| `spouting_profile` | Spouting profile type |
| `roof_colour` | Roof color spec |
| `roof_profile` | Roof profile type |
| `downpipe_size` | Downpipe size spec |
| `downpipe_colour` | Downpipe color spec |

#### Status Values Changed
| Old Status | New Status |
|------------|------------|
| Awaiting Order | Not Started |
| Ordered | Not Started |
| In Progress | In Progress |
| Urgent | In Progress |
| Held Up | On Hold |
| Complete | Completed |
| Invoiced | Completed |
| Closed | Completed |

### Added

#### New Edge Functions (`supabase/functions/`)
| Function | Method | Description |
|----------|--------|-------------|
| `add-task/index.ts` | POST | Create new task |
| `get-tasks/index.ts` | GET | Fetch all tasks |
| `update-task/index.ts` | PUT | Update existing task |
| `delete-task/index.ts` | DELETE | Delete task by ID |
| `get-tasks-by-worker/index.ts` | GET | Fetch tasks for specific worker |

#### New TypeScript Types (`src/types/index.ts`)
```typescript
export enum TaskStatus {
  NotStarted = 'Not Started',
  InProgress = 'In Progress',
  OnHold = 'On Hold',
  Completed = 'Completed'
}

export interface Task {
  id: string;
  name: string;
  notes: string | null;
  worker_id: string | null;
  secondary_worker_ids?: string[];
  start_date: string | null;
  end_date: string | null;
  status: TaskStatus;
  tile_color: string | null;
  created_at: string;
}
```

#### New Database Migration
- `supabase/migrations/20260303_refactor_jobs_to_tasks.sql`
  - Renames tables and columns
  - Drops roofing columns
  - Migrates status values
  - Updates indexes and RLS policies

### Changed

#### Renamed Components
| Old Name | New Name |
|----------|----------|
| `src/components/jobs/` | `src/components/tasks/` |
| `JobForm.tsx` | `TaskForm.tsx` |
| `JobTile.tsx` | `TaskTile.tsx` |
| `DraggableJob.tsx` | `DraggableTask.tsx` |
| `DayJobsModal.tsx` | `DayTasksModal.tsx` |
| `GlobalJobSearch.tsx` | `GlobalTaskSearch.tsx` |

#### Renamed Store & Hook
| Old Name | New Name |
|----------|----------|
| `src/store/jobsStore.ts` | `src/store/tasksStore.ts` |
| `src/hooks/useRealtimeJobs.ts` | `src/hooks/useRealtimeTasks.ts` |

#### Updated UI Labels
- "New Job" → "New Task"
- "Jobs to Schedule" → "Tasks to Schedule"
- "Job Address" → "Task Name"
- "Create Job" → "Create Task"
- "Delete Job" → "Delete Task"

#### Simplified Task Form
The TaskForm now contains only essential fields:
1. Task Name (required)
2. Lead Team Member (dropdown)
3. Additional Team Members (multi-select)
4. Status (Not Started, In Progress, On Hold, Completed)
5. Start Date
6. End Date
7. Tile Color (color picker)
8. Notes (textarea)

### Backwards Compatibility

To allow gradual migration, legacy exports are maintained:

```typescript
// src/types/index.ts
export type Job = Task;
export { TaskStatus as JobStatus };

// src/store/tasksStore.ts
export const useJobsStore = useTasksStore;
export const useJobs = useTasks;

// src/components/tasks/index.ts
export { TaskForm as JobForm };
export { TaskTile as JobTile };

// src/components/scheduler/index.ts
export { DraggableTask as DraggableJob };
export { DayTasksModal as DayJobsModal };
export { GlobalTaskSearch as GlobalJobSearch };
```

### Migration Guide

#### For Database
```bash
# Apply the migration
cd MosaicScheduler
npx supabase db push
# OR apply via Supabase Dashboard SQL Editor
```

#### For Edge Functions
```bash
# Deploy new edge functions
supabase functions deploy add-task
supabase functions deploy get-tasks
supabase functions deploy update-task
supabase functions deploy delete-task
supabase functions deploy get-tasks-by-worker

# Optionally delete old functions after verification
supabase functions delete add-job
supabase functions delete get-jobs
supabase functions delete update-job
supabase functions delete delete-job
supabase functions delete get-jobs-by-worker
```

#### For Frontend Code
1. Update imports from `Job` to `Task`
2. Update props from `job` to `task`
3. Update callbacks from `onJobClick` to `onTaskClick`
4. Update store usage from `useJobsStore` to `useTasksStore`

### Files Summary

**Files Created (10):**
- `supabase/functions/add-task/index.ts`
- `supabase/functions/get-tasks/index.ts`
- `supabase/functions/update-task/index.ts`
- `supabase/functions/delete-task/index.ts`
- `supabase/functions/get-tasks-by-worker/index.ts`
- `supabase/migrations/20260303_refactor_jobs_to_tasks.sql`
- `src/components/tasks/TaskForm.tsx`
- `src/components/tasks/TaskTile.tsx`
- `src/store/tasksStore.ts`
- `src/hooks/useRealtimeTasks.ts`

**Files Renamed (5):**
- `DraggableJob.tsx` → `DraggableTask.tsx`
- `DayJobsModal.tsx` → `DayTasksModal.tsx`
- `GlobalJobSearch.tsx` → `GlobalTaskSearch.tsx`
- Component directory: `jobs/` → `tasks/`

**Files Modified (15+):**
- `src/types/index.ts` - New Task interface and TaskStatus enum
- `src/types/supabase.ts` - Updated database types
- `src/App.tsx` - Updated imports and handlers
- `src/components/layout/Navbar.tsx` - "New Task" button
- `src/components/scheduler/WeekView.tsx` - Task terminology
- `src/components/scheduler/MonthView.tsx` - Task terminology
- `src/components/scheduler/CalendarGrid.tsx` - Task props
- `src/components/scheduler/CalendarCell.tsx` - Task props
- `src/components/scheduler/MasterRow.tsx` - Task props
- `src/components/scheduler/UnscheduledPanel.tsx` - Task terminology
- All scheduler components updated with task terminology

### Verification Checklist

After applying this update:

- [ ] Database migration applied successfully
- [ ] New edge functions deployed
- [ ] `npm run build` succeeds
- [ ] Can create new tasks
- [ ] Can edit existing tasks
- [ ] Can delete tasks
- [ ] Drag-and-drop scheduling works
- [ ] Task search works
- [ ] Status changes persist
- [ ] Real-time updates work across browsers

### Lessons Learned

1. **Plan comprehensively**: A rename operation touches many files. Use the Plan agent to map all affected areas before starting.

2. **Backwards compatibility matters**: Maintaining aliases (`Job = Task`) allows gradual migration and prevents breakage in external integrations.

3. **Database migrations are separate**: The frontend can be deployed before the database migration, as long as the old edge functions still exist.

4. **Edge functions can coexist**: Old (`get-jobs`) and new (`get-tasks`) functions can both exist during transition.

5. **Status value migration**: When changing enum values, create a mapping table in the migration to preserve existing data correctly.

---

## [0.1.7] - 2026-03-03 - Scheduler UX Improvements

### Overview
Fixed a bug where jobs with assigned workers but no start date would "disappear" and improved team member row ordering in the Week View for better usability.

### Fixed

#### Unscheduled Jobs Panel Bug
**Problem:** When creating a job with a team member assigned but no start date, the job would not appear anywhere:
- Not in the "Jobs to Schedule" panel (had a worker assigned)
- Not on the calendar (had no start date)

**Root Cause:** `UnscheduledPanel.tsx` line 42 filtered jobs requiring BOTH `!job.start_date && !job.worker_id`. Jobs with a worker but no date fell through the cracks.

**Solution:** Changed filter logic to only check `!job.start_date`. A job is "unscheduled" if it has no date - having a worker assigned is irrelevant to whether it needs scheduling.

**File Changed:** `src/components/scheduler/UnscheduledPanel.tsx`

```typescript
// Before (broken)
return jobs.filter(job => !job.start_date && !job.worker_id);

// After (fixed)
return jobs.filter(job => !job.start_date);
```

### Added

#### Team Member Row Ordering
**Feature:** Week View now displays team member rows in a logical, consistent order:

1. **Master Row** (unchanged - always at top)
2. **Logged-in User's Row** (prioritized for quick access)
3. **Unassigned Row** (for jobs needing assignment)
4. **Other Team Members** (sorted alphabetically by name)

**Implementation:**
- Added `useAuth()` hook to `CalendarGrid.tsx` to get `currentWorker`
- Created `currentUserMember` and `otherMembers` computed values
- Reordered JSX rendering to match the new order

**File Changed:** `src/components/scheduler/CalendarGrid.tsx`

```typescript
// New sorting logic
const { currentUserMember, otherMembers } = React.useMemo(() => {
  const currentUser = currentWorker ? teamMembers.find(m => m.id === currentWorker.id) : null;
  const others = teamMembers
    .filter(m => !currentWorker || m.id !== currentWorker.id)
    .sort((a, b) => a.name.localeCompare(b.name));
  return { currentUserMember: currentUser, otherMembers: others };
}, [teamMembers, currentWorker]);
```

### Files Modified
| File | Changes |
|------|---------|
| `src/components/scheduler/UnscheduledPanel.tsx` | Fixed unscheduled job filter logic |
| `src/components/scheduler/CalendarGrid.tsx` | Added row ordering, imported `useAuth` |

### Verification
1. Create a job with a team member assigned but no start date
2. Verify it appears in "Jobs to Schedule" panel
3. Check Week View row order matches: Your row → Unassigned → Others (alphabetical)
4. Drag the unscheduled job to calendar and verify it moves correctly

### Lessons Learned
1. **Filter logic must match UX intent:** "Unscheduled" means no date, not "no date AND no worker"
2. **User's own row should be prioritized:** Reduces scrolling and improves personal task visibility
3. **Alphabetical ordering reduces confusion:** Consistent ordering helps users find team members quickly

---

## [0.1.6] - 2026-03-03 - Mosaic Brand Redesign

### Overview
Complete visual rebrand from "Fergus-style" to Mosaic brand guidelines. Updated colors, typography, and visual consistency across all components.

### Added

#### Brand Assets
- **Font files:** `src/assets/fonts/bogart-medium.ttf`, `src/assets/fonts/bogart-regular.ttf`
- **Brand PDF:** `docs/BrandGuidelines_Mosaic.pdf`
- **New directive:** `directives/brand_guidelines.md` - Complete brand color and typography reference

#### Tailwind Configuration
Added 10 brand colors to `tailwind.config.js`:
| Color | Hex | Usage |
|-------|-----|-------|
| Garlic | `#F9F8F1` | Page backgrounds |
| Aubergine | `#3A4750` | Navbar, dark backgrounds |
| Margaux | `#477296` | Focus states, links |
| Saffron | `#B96129` | CTA buttons |
| Blueberry | `#345981` | Primary buttons, default tiles |
| Vanilla | `#F7F4E9` | Panel backgrounds |
| Charcoal | `#333333` | Body text |
| Seafoam | `#94B0B3` | Selection highlights |
| Cinnamon | `#A65628` | Secondary accent |
| Sorbet | `#E2C1A4` | Drop zones |

#### CSS Updates
- Added @font-face declarations for Bogart fonts in `src/index.css`
- Added base typography styles (headlines use Bogart, body uses Inter)

### Changed

#### Components Updated (~20 files)

| Component | Changes |
|-----------|---------|
| `Navbar.tsx` | `bg-aubergine`, `bg-saffron` for buttons |
| `LoginForm.tsx` | `bg-garlic`, `bg-aubergine`, `focus:ring-margaux`, `font-bogart` |
| `JobForm.tsx` | All `indigo-*` → brand colors, updated tile color palette |
| `JobTile.tsx` | Default color → `#345981` (Blueberry) |
| `CalendarGrid.tsx` | `bg-garlic`, `bg-vanilla`, `bg-margaux/20`, `bg-sorbet/30` |
| `CalendarCell.tsx` | Brand highlight colors |
| `WorkerSidebar.tsx` | `bg-vanilla`, `bg-garlic`, `text-margaux` |
| `UnscheduledPanel.tsx` | `bg-vanilla`, `bg-garlic`, `focus:ring-margaux`, `bg-sorbet/30` |
| `MonthView.tsx` | `text-margaux`, `bg-garlic`, `bg-margaux/10`, `bg-vanilla` |
| `WeekView.tsx` | `text-margaux hover:text-blueberry` |
| `MasterRow.tsx` | `border-margaux`, `bg-margaux/20`, `text-blueberry` |
| `WorkerManageModal.tsx` | `focus:ring-margaux`, `text-margaux hover:text-blueberry` |
| `TeamManageModal.tsx` | `font-bogart`, `focus:ring-margaux` |
| `TeamMemberForm.tsx` | `focus:border-margaux`, `bg-blueberry` |
| `WorkerForm.tsx` | `font-bogart`, `focus:ring-margaux`, `bg-blueberry` |
| `GlobalJobSearch.tsx` | `focus:ring-margaux`, `bg-vanilla` |
| `DayJobsModal.tsx` | Brand colors throughout |

#### Job Tile Color Palette
Updated color options in `JobForm.tsx` to brand-aligned palette:
```javascript
const colorOptions = [
  '#345981',  // blueberry (default)
  '#477296',  // margaux
  '#B96129',  // saffron
  '#A65628',  // cinnamon
  '#94B0B3',  // seafoam
  '#3A4750',  // aubergine
  '#E2C1A4',  // sorbet
  '#333333',  // charcoal
  // Plus utility colors for variety
];
```

### Fixed

#### Color Migration Issues
- **MasterRow.tsx** - 6 instances of `indigo-*` missed in initial pass
- **WorkerManageModal.tsx** - 5 instances of `indigo-*` missed in initial pass

### Documentation Updated
- `directives/brand_guidelines.md` - New comprehensive brand reference
- `directives/code_standards.md` - Added Brand & Styling Standards section
- `directives/troubleshooting.md` - Added Brand & Styling Issues section

### Verification

After this update, verify:
```bash
# No old indigo colors should exist
grep -r "indigo-" src/
# Expected: No matches found

# Build should succeed
npm run build
# Expected: ✓ built successfully
```

### Lessons Learned

1. **Comprehensive grep search required:** When updating colors across a codebase, run `grep -r "pattern" src/` to find ALL instances, not just the "obvious" files.

2. **Files commonly missed:**
   - Modal components (`*Modal.tsx`)
   - Master/aggregate views (`MasterRow.tsx`)
   - Form input focus states

3. **Browser caching:** After deployment, users may need to hard refresh (Ctrl+Shift+R) to see color changes.

---

## [0.1.5] - 2026-03-03 - Performance Optimization

### Problem Addressed
Users experienced lag when adding/moving job tiles, and a disruptive "auto-refresh" every 60 seconds that caused the entire calendar to re-render.

### Root Causes Identified
1. **60-second polling** - Fetched ALL data every minute, regardless of changes
2. **Missing React.memo** - CalendarGrid and WorkerRow re-rendered on any state change
3. **O(n) filtering per callback** - `getWorkerDayJobs` filtered entire jobs array on every call
4. **Zustand over-subscription** - Components subscribed to entire store, not specific slices
5. **Loading toasts on refresh** - "Updating jobs..." toast appeared every 60 seconds

### Added

#### Real-time Subscriptions (`src/hooks/`)
- **`useRealtimeJobs.ts`** - Subscribes to `jobs` table changes via Supabase Realtime
- **`useRealtimeTeam.ts`** - Subscribes to `workers` table changes via Supabase Realtime

#### Zustand Selectors (`src/store/`)
- **`jobsStore.ts`** - Added `useJobs()`, `useJobsLoading()`, `useJobsError()`, `useSelectedJob()`, `useJobActions()`
- **`teamStore.ts`** - Added `useTeamMembers()`, `useTeamLoading()`, `useTeamError()`, `useTeamActions()`

#### New Documentation
- **`directives/performance.md`** - Performance patterns, realtime architecture, optimization checklist

### Changed

#### App.tsx
- **Replaced polling with realtime** - Removed 60-second `setInterval`, added `useRealtimeJobs()` and `useRealtimeTeam()`
- **Added visibility refresh** - Data refreshes when tab becomes visible (handles stale tabs)

#### WeekView.tsx
- **Removed loading toasts** - No more "Updating jobs..." / "Updating team members..." every refresh
- **Pre-computed worker-day map** - `workerDayJobsMap` enables O(1) lookups instead of O(n) filtering

#### CalendarGrid.tsx
- **Memoized CalendarGrid** - Added `CalendarGridMemo` with custom prop comparison
- **Memoized WorkerRow** - Wrapped with `React.memo` and comparison function
- **Memoized CalendarCell** - Wrapped with `React.memo` and comparison function

### Performance Impact
| Metric | Before | After |
|--------|--------|-------|
| Auto-refresh frequency | Every 60s | Only on data changes (realtime) |
| Re-renders per job move | Entire calendar | Only affected rows/cells |
| Job lookup complexity | O(n) per callback | O(1) via Map |
| Loading toast interruptions | Every 60s | Never (removed) |

### Files Modified
- `src/App.tsx` - Realtime hooks, removed polling
- `src/components/scheduler/WeekView.tsx` - Removed toasts, added workerDayJobsMap
- `src/components/scheduler/CalendarGrid.tsx` - React.memo on 3 components
- `src/store/jobsStore.ts` - Added selectors
- `src/store/teamStore.ts` - Added selectors

### Files Created
- `src/hooks/useRealtimeJobs.ts`
- `src/hooks/useRealtimeTeam.ts`
- `directives/performance.md`

### Verification
- Build passes: `npm run build` succeeds
- No TypeScript errors
- Realtime subscriptions connect successfully

---

## [0.1.4] - 2026-02-12 - Security & Deployment

### Added
- **`admin_users` table** - Database source of truth for admin permissions
- **Deployment Documentation** - New `directives/deployment.md` guide

### Changed
- **AuthContext.tsx** - Now uses `workersStore` (Edge Functions) to verify worker profiles, enforcing Admin-provisioned accounts.
- **WorkerManageModal.tsx** - Refactored to use `jobsStore` for job checks instead of legacy API.
- **Project Structure** - Removed legacy "Direct Supabase API" layer:
  - Deleted `src/api/jobsApi.ts`
  - Deleted `src/api/workersApi.ts`
  - Deleted `src/hooks/useWorkersData.ts`
- **Hosting** - Linked Netlify to GitHub `master` branch for continuous deployment

### Security
- **Strict RLS** - Applied `20260211_tighten_rls.sql` migration
  - Anonymous users: No access
  - Authenticated users: Read-only access to jobs/workers
  - Admin users: Full create/edit/delete access

### Fixed
- **Read-Only Mode Bug** - Fixed issue where valid admins were seen as read-only users because Netlify environment variables were missing. Frontend now correctly queries the database properties.

---

## [2026-02-11] - Dead Code Cleanup & bolt.new Artifact Removal

### Background
Project was migrated from bolt.new to local development. Analysis revealed ~871 lines of dead code (debug modals, unused hooks/stores) and bolt.new template artifacts that were no longer needed.

### Removed

#### Dead Code Files (Never Imported Anywhere)
| File | Lines | Purpose | Why Removed |
|------|-------|---------|-------------|
| `src/components/HelloModal.tsx` | 180 | Debug modal to test `get-workers` edge function | 0 imports - debug tool never wired to UI |
| `src/components/RawDataModal.tsx` | 62 | Generic JSON display modal | 0 imports - debug tool never wired to UI |
| `src/components/WorkersDebugModal.tsx` | ~222 | Workers data flow debug modal | 0 imports - debug tool never wired to UI |
| `src/hooks/useJobsData.ts` | 107 | React Query hook for jobs CRUD | 0 imports - app uses `jobsStore.ts` instead |
| `src/store/usersStore.ts` | 137 | Zustand store for users | 0 imports - no user management feature exists |
| `src/api/usersApi.ts` | 163 | API layer for users CRUD | Only imported by dead `usersStore.ts` |

**Total Dead Code Removed:** ~871 lines

#### bolt.new Artifacts
| Item | Description |
|------|-------------|
| `.bolt/` directory | Template metadata, config, and **83 discarded migration files** |

#### Unused Dependencies
| Package | Reason |
|---------|--------|
| `dotenv` | Vite handles env vars via `import.meta.env` - no `dotenv` imports existed |

### How Dead Code Was Identified

Dead code was identified by searching for imports:
```bash
# Example: Check if HelloModal is imported anywhere
grep -r "import.*HelloModal" src/
# Result: No matches found = safe to delete
```

A file is "dead" when:
1. It exports functions/components
2. No other file imports from it
3. Therefore it never executes in the running app

### Verification
- Ran `npm run build` after cleanup
- Build succeeded with no errors
- All active functionality (jobs, workers, calendar views) unaffected

### Files That Remain (Actively Used)
These files have multiple imports and are essential:
- `src/store/jobsStore.ts` → Used by App.tsx, MonthView, WeekView
- `src/store/workersStore.ts` → Used by App.tsx, JobForm, DayJobsModal, WorkerManageModal, WeekView
- `src/api/jobsApi.ts` → Used by WorkerManageModal.tsx (getJobsForWorker)
- `src/api/workersApi.ts` → Used by AuthContext.tsx (getWorkerByEmail, createOrUpdateWorkerProfile)
- `src/hooks/useWorkersData.ts` → Uses workersApi.ts
- All components in `src/components/scheduler/` → Actively imported and rendered

### Lessons Learned
1. **bolt.new leaves artifacts** - Always check for `.bolt/` directory and discarded migrations
2. **Debug modals accumulate** - Development utilities should be removed before production
3. **Parallel patterns compete** - Project had React Query hooks AND Zustand stores doing same thing
4. **Import search must be comprehensive** - Run `grep -r "from.*fileName" src/` and check ALL results, not just likely files

### Correction (2026-02-12)
An agent initially incorrectly stated that `jobsApi.ts` and `workersApi.ts` were only used by stores (which use Edge Functions instead). A second analysis revealed they ARE actively imported by `AuthContext.tsx` and `WorkerManageModal.tsx`. The lesson: always run the full grep search, don't make assumptions based on checking only some files.

---

## [2026-02-11] - UI Enhancements & Mobile Optimization

### Added

#### New Components (`src/components/scheduler/`)
- **`GlobalJobSearch.tsx`** - Calendar-wide search bar for finding jobs by address, customer name, or quote number
  - Keyboard navigation (Arrow keys, Enter, Escape)
  - Click result to open job modal
  - Debounced search with dropdown results

#### New Edge Function (`supabase/functions/`)
- **`update-worker/index.ts`** - PUT endpoint for updating worker name/email/phone

#### New Store Method (`src/store/workersStore.ts`)
- **`updateWorker(id, updates)`** - Update worker details via edge function

### Changed

#### UnscheduledPanel (`src/components/scheduler/UnscheduledPanel.tsx`)
- Added `isCollapsed` and `onToggleCollapse` props
- Collapse/expand button with chevron icon
- Collapsed state shows vertical "Jobs (N)" text
- Hidden on mobile screens (`hidden md:flex`)

#### WeekView & MonthView
- Added `isJobsPaneCollapsed` state with localStorage persistence
- Integrated GlobalJobSearch component in header
- Added `toggleJobsPane()` function

#### CalendarGrid (`src/components/scheduler/CalendarGrid.tsx`)
- Responsive worker column: `w-24 sm:w-32 md:w-48`
- Responsive day headers: `flex-1 min-w-0` with `EEE` format
- Responsive text sizes: `text-xs sm:text-sm md:text-base`

#### WorkerManageModal (`src/components/scheduler/WorkerManageModal.tsx`)
- Added inline editing for worker name and email
- Edit button (pencil icon) next to each worker
- Save/Cancel buttons during edit mode
- Integrated with new `updateWorker()` store method

#### GlobalJobSearch (`src/components/scheduler/GlobalJobSearch.tsx`)
- Responsive width: `max-w-xs sm:max-w-sm md:max-w-md`
- Responsive padding and positioning

### Feature Summary

| Feature | Description | Status |
|---------|-------------|--------|
| Global Job Search | Search all jobs from calendar header | ✅ Complete |
| Edit Worker Name | Inline editing in Manage Workers modal | ✅ Complete (pending deploy) |
| Minimize Jobs Pane | Collapse/expand Jobs to Schedule panel | ✅ Complete |
| Mobile Optimization | Responsive widths, hidden elements on mobile | ✅ Complete |

---

## [2026-02-11] - Code Quality & Performance Improvements

### Added

#### New Utilities (`src/utils/`)
- **`logger.ts`** - Centralized logging with configurable levels (debug/info/warn/error)
- **`validation.ts`** - Form validation utilities (required, email, phone, dateRange, maxLength, minLength)
- **`errors.ts`** - Centralized error handling with AppError class and error classification
- **`debounce.ts`** - Debounce and throttle functions for rate-limiting

#### New Documentation (`directives/`)
- **`code_standards.md`** - Coding conventions and patterns
- **`utilities.md`** - Utility function reference
- **`changelog.md`** - This file
- **`troubleshooting.md`** - Common issues and solutions

#### New Database Migration
- **`supabase/migrations/20260211_tighten_rls.sql`** - Security hardening with proper RLS policies

### Changed

#### Environment Configuration
- Admin emails moved from hardcoded array to `VITE_ADMIN_EMAILS` environment variable
- Added `VITE_LOG_LEVEL` for configurable logging verbosity

#### State Management
- Removed redundant `fetchJobs()` calls after mutations in `jobsStore.ts`
- Removed redundant `fetchWorkers()` calls after mutations in `workersStore.ts`
- Implemented true optimistic updates - local state trusted without refetch

#### TypeScript Improvements
- Fixed `any` type in `App.tsx:86` → `Omit<Job, 'id' | 'created_at'>`
- Fixed `any` type in `HelloModal.tsx` → Added `WorkersResponse` interface
- Fixed `any` type in `RawDataModal.tsx:5` → `Record<string, unknown> | unknown[]`
- Fixed `any` type in `MonthView.tsx:490` → `Worker | null`

#### Logging
- Replaced all `console.log` with `logger.debug` in:
  - `src/store/jobsStore.ts`
  - `src/store/workersStore.ts`
  - `src/App.tsx`
  - `src/context/AuthContext.tsx`
  - `src/components/jobs/JobForm.tsx`
- Replaced all `console.error` with `logger.error`

#### Form Validation
- Added date range validation to `JobForm.tsx`
- Validates end date >= start date before submission

### Removed

#### Deleted Files
- **`src/store/jobStore.ts`** - Unused duplicate store (had broken import to non-existent `../lib/supabase`)
- **`src/store/workerStore.ts`** - Unused duplicate store (superseded by `workersStore.ts`)

### Fixed

#### Issues Resolved
| Issue | Fix | Files |
|-------|-----|-------|
| Hardcoded admin emails | Moved to env variable | `AuthContext.tsx`, `.env` |
| TypeScript `any` types | Added proper types | 4 files |
| Excessive console logging | Replaced with logger | 5 files |
| Redundant API calls | Removed post-mutation fetches | 2 stores |
| Missing date validation | Added dateRange validator | `JobForm.tsx` |
| Duplicate stores | Deleted unused files | 2 files |

---

## [Previous] - Initial Development

### Features
- Job management (CRUD operations)
- Worker management
- Week and month calendar views
- Drag-and-drop job scheduling
- Multi-worker job assignments (primary + secondary)
- Role-based access control (edit vs read-only)
- Email/password authentication via Supabase

### Job Status Workflow
1. Awaiting Order
2. Ordered
3. In Progress
4. Held Up
5. Complete
6. Invoiced
7. Closed
8. Urgent

---

## Migration Guide

### Applying the Security Migration

**Prerequisites:**
- Supabase CLI installed
- Logged into Supabase

**Steps:**
```bash
# Navigate to project
cd MosaicScheduler

# Link to Supabase project (if not already)
npx supabase link --project-ref qkclmypehdlyhwxhxyue

# Apply migration (test in staging first!)
npx supabase db push
```

**Post-Migration:**
1. Verify `admin_users` table was created
2. Confirm initial admin emails are seeded
3. Test that authenticated users can read data
4. Test that non-admin users cannot modify data
5. Test that admin users can modify data

### Updating Environment Variables

Add to your `.env` file:
```bash
# Admin emails (comma-separated)
VITE_ADMIN_EMAILS=user1@example.com,user2@example.com

# Log level (debug, info, warn, error)
VITE_LOG_LEVEL=warn
```

---

## Version History

| Version | Date | Summary |
|---------|------|---------|
| 0.1.0 | Initial | MVP with core scheduling features |
| 0.1.1 | 2026-02-11 | Code quality, performance, security improvements |
| 0.1.2 | 2026-02-11 | UI enhancements: search bar, edit workers, collapsible pane, mobile optimization |
| 0.1.3 | 2026-02-11 | Dead code cleanup: removed ~871 lines, bolt.new artifacts, unused dependencies |
| 0.1.4 | 2026-02-12 | Security & deployment: admin_users table, strict RLS, Netlify deployment |
| 0.1.5 | 2026-03-03 | Performance optimization: realtime subscriptions, React.memo, removed polling |
| 0.1.6 | 2026-03-03 | Mosaic brand redesign: colors, typography, ~20 component updates |
| 0.1.7 | 2026-03-03 | Scheduler UX: fixed unscheduled tasks bug, added team member row ordering |
| **0.2.0** | **2026-03-03** | **Major refactoring: Jobs → Tasks, simplified form, new edge functions** |
