# Project Overview

## Project Name: Mosaic Scheduler

### Purpose
The Mosaic Scheduler is a web-based application designed to manage scheduling and task tracking for restaurant operations. It features functionality for creating tasks, assigning team members, drag-and-drop scheduling across calendar views, and tracking project status through various stages.

### Technology Stack
- **Frontend Framework**: React (v18) with TypeScript
- **Build Tool**: Vite (v5)
- **Styling**: TailwindCSS (v3), PostCSS
- **State Management**: Zustand (lightweight stores)
- **Backend / Database**: Supabase (PostgreSQL, Auth, Edge Functions)
- **Drag & Drop**: React DnD
- **Icons**: Lucide React
- **Notifications**: React Hot Toast
- **Date Handling**: date-fns

### Architecture
- **DOE Framework**: This workspace follows the Directives (SOPs), Orchestration (Agent), Execution (Scripts) model for AI-assisted development.
    - `directives/`: Instructions and SOPs
    - `execution/`: Deterministic Python scripts
    - `src/utils/`: TypeScript utilities (logger, validation, errors, debounce)
    - `.tmp/`: Temporary files
- **Hosting**: Netlify (Frontend) - [Project Link](https://app.netlify.com/projects/teal-eclair-7a0089/overview)
- **Version Control**: GitHub (`devesesam/mosaic-management-system`)

### Key Directories

```
MosaicScheduler/
├── src/
│   ├── api/              # API layer (Supabase client initialization only)
│   ├── components/       # React components
│   │   ├── auth/         # Authentication (Login, etc.)
│   │   ├── tasks/        # Task management (TaskForm, TaskTile)
│   │   ├── scheduler/    # Calendar views and scheduling
│   │   │   ├── WeekView.tsx
│   │   │   ├── MonthView.tsx
│   │   │   ├── CalendarGrid.tsx
│   │   │   ├── GlobalTaskSearch.tsx    # Search all tasks
│   │   │   ├── UnscheduledPanel.tsx    # Tasks to Schedule (collapsible)
│   │   │   ├── WorkerManageModal.tsx   # Edit/delete workers
│   │   │   ├── DraggableTask.tsx
│   │   │   └── DayTasksModal.tsx
│   │   ├── workers/      # Worker forms
│   │   └── layout/       # Navbar, UserSettingsModal, etc.
│   ├── context/          # React contexts (AuthContext)
│   ├── store/            # Zustand stores (tasksStore, teamStore)
│   ├── hooks/            # Custom React hooks (useRealtimeTasks, useRealtimeTeam)
│   ├── types/            # TypeScript type definitions
│   └── utils/            # Utility functions (logger, validation, errors, debounce)
├── supabase/
│   ├── functions/        # Edge Functions
│   │   ├── get-tasks/
│   │   ├── add-task/
│   │   ├── update-task/
│   │   ├── delete-task/
│   │   ├── get-tasks-by-worker/
│   │   ├── get-workers/
│   │   ├── add-worker/
│   │   ├── update-worker/
│   │   └── delete-worker/
│   └── migrations/       # Database migrations
├── directives/           # SOPs and documentation
├── execution/            # Python scripts for automation
└── .tmp/                 # Temporary processing files
```

### Key Files & Resources
- **Agent Instructions**: `CLAUDE.md`, `AGENTS.md`, `GEMINI.md` - Core operating instructions for AI agents
- **Environment Config**: `.env` (contains Supabase credentials - DO NOT COMMIT)
- **Supabase Project**: [Dashboard](https://supabase.com/dashboard/project/qkclmypehdlyhwxhxyue)
- **GitHub Repository**: [Repo](https://github.com/devesesam/mosaic-management-system)

### Environment Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJ...` |
| `VITE_ADMIN_EMAILS` | Comma-separated admin emails | `user1@example.com,user2@example.com` |
| `VITE_LOG_LEVEL` | Logging verbosity | `debug`, `info`, `warn`, `error` |

### Getting Started
1. **Install Dependencies**: `npm install`
2. **Configure Environment**: Copy `.env.example` to `.env` and fill in values
3. **Run Development Server**: `npm run dev`
4. **Build for Production**: `npm run build`

### Database Tables

| Table | Purpose |
|-------|---------|
| `workers` | Worker profiles (name, email, phone, role) |
| `tasks` | Task records (name, notes, dates, status, tile_color) |
| `task_secondary_workers` | Junction table for multi-worker assignments |
| `admin_users` | Email-based admin role management |

### Task Status Values

| Status | Description |
|--------|-------------|
| `Not Started` | Task created but not begun |
| `In Progress` | Task is actively being worked on |
| `On Hold` | Task is temporarily paused |
| `Completed` | Task is finished |

### Task Data Model

```typescript
interface Task {
  id: string;
  name: string;           // Task name/title
  notes: string | null;   // Additional notes
  worker_id: string | null;  // Primary assigned team member
  secondary_worker_ids?: string[];  // Additional team members
  start_date: string | null;  // Scheduled start
  end_date: string | null;    // Scheduled end
  status: TaskStatus;     // Not Started | In Progress | On Hold | Completed
  tile_color: string | null;  // UI color for calendar tiles
  created_at: string;     // Creation timestamp
}
```

### Current Status
- **Version**: 0.2.1
- **Last Updated**: 2026-03-03
- **Recent Improvements**:
  - Replaced legacy `jobs` store with `tasks` in `MonthView.tsx` and Team management modals.
  - Resolved `App.tsx` "Error Loading Data" crashes by deploying unauthenticated Edge Functions.
  - Deleted obsolete legacy components (`DraggableJob.tsx`, `DayJobsModal.tsx`, `GlobalJobSearch.tsx`, `WorkerManageModal.tsx`).
  - Major refactoring: Renamed "job" to "task" throughout codebase
  - Simplified task form (removed roofing-specific fields)
  - New edge functions: add-task, get-tasks, update-task, delete-task, get-tasks-by-worker
  - Database migration to rename tables and columns
  - Performance optimization (realtime subscriptions, React.memo, O(1) lookups)

### Security & Permissions
- **Authentication**: Email/Password via Supabase Auth
- **Authorization**:
  - **Admin**: Full access (via `admin_users` table)
  - **Worker**: Read-only access to their own schedule (via `workers` table link)
  - **Public**: No access
- **New User Flow**:
  - Admin creates worker profile first
  - Worker signs up with same email
  - System automatically links profile
  - Unauthorized signups are blocked (no profile = no access)

### Codebase Health
After cleanup, the codebase now has:
- **No dead code** - All files are actively imported
- **No bolt.new artifacts** - `.bolt/` directory removed
- **Clean dependencies** - Only used packages remain
- **Single data pattern** - Zustand stores + Edge Functions for all data access
- **Consistent naming** - "Task" terminology throughout (no "job" references)
- **Backwards compatibility** - Legacy exports maintained for gradual migration

### Architecture Note
- The "Mixed Data Pattern" has been resolved. All components now use Stores/Edge Functions.
- `src/api/` folder is now minimal (only used for Supabase client initialization).
- Legacy "job" terminology has backwards compatibility aliases for gradual migration.

### Backwards Compatibility

The codebase maintains backwards compatibility for components that may still reference "job" terminology:

```typescript
// In src/types/index.ts
export type Job = Task;  // Alias for backwards compatibility

// In src/store/tasksStore.ts
export const useJobsStore = useTasksStore;  // Alias

// In src/components/tasks/index.ts
export { TaskForm as JobForm };  // Re-export
```

### Related Directives
- [Code Standards](./code_standards.md) - Coding conventions and patterns
- [Performance Guide](./performance.md) - Realtime subscriptions, React.memo, optimization patterns
- [Utilities Reference](./utilities.md) - Documentation for utility functions
- [UI Features](./ui_features.md) - UI components, search, mobile optimization
- [Changelog](./changelog.md) - History of changes and improvements
- [Troubleshooting](./troubleshooting.md) - Common issues and solutions
