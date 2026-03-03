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
│   ├── api/              # API layer (Supabase operations)
│   ├── components/       # React components
│   │   ├── auth/         # Authentication (Login, etc.)
│   │   ├── jobs/         # Job management (JobForm, JobTile)
│   │   ├── scheduler/    # Calendar views and scheduling
│   │   │   ├── WeekView.tsx
│   │   │   ├── MonthView.tsx
│   │   │   ├── CalendarGrid.tsx
│   │   │   ├── GlobalJobSearch.tsx    # Search all jobs
│   │   │   ├── UnscheduledPanel.tsx   # Jobs to Schedule (collapsible)
│   │   │   ├── WorkerManageModal.tsx  # Edit/delete workers
│   │   │   └── DraggableJob.tsx
│   │   ├── workers/      # Worker forms
│   │   └── layout/       # Navbar, etc.
│   ├── context/          # React contexts (AuthContext)
│   ├── store/            # Zustand stores (jobsStore, workersStore)
│   ├── hooks/            # Custom React hooks
│   ├── types/            # TypeScript type definitions
│   └── utils/            # Utility functions (logger, validation, errors, debounce)
├── supabase/
│   ├── functions/        # Edge Functions
│   │   ├── get-jobs/
│   │   ├── add-job/
│   │   ├── update-job/
│   │   ├── delete-job/
│   │   ├── get-workers/
│   │   ├── add-worker/
│   │   ├── update-worker/   # NEW: Update worker name/email
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
| `jobs` | Job records (address, customer, materials, dates, status) |
| `job_secondary_workers` | Junction table for multi-worker assignments |
| `admin_users` | Email-based admin role management |

### Current Status
- **Version**: 0.1.4
- **Last Updated**: 2026-02-12
- **Recent Improvements**:
  - Full deployment to Netlify via GitHub
  - Security hardening (RLS + Admin Table)
  - Fixed Admin permission checks
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
- **Debug modals removed** - HelloModal, RawDataModal, WorkersDebugModal deleted

⚠️ **Architecture Note:**
- The "Mixed Data Pattern" has been resolved. All components now use Stores/Edge Functions.
- `src/api/` folder is now minimal (only used for Supabase client initialization).

### Related Directives
- [Code Standards](./code_standards.md) - Coding conventions and patterns
- [Utilities Reference](./utilities.md) - Documentation for utility functions
- [UI Features](./ui_features.md) - UI components, search, mobile optimization
- [Changelog](./changelog.md) - History of changes and improvements
- [Troubleshooting](./troubleshooting.md) - Common issues and solutions
