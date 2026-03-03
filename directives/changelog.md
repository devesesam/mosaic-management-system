# Changelog

All notable changes to the Tasman Roofing Scheduler project are documented in this file.

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
cd RoofingScheduler

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
