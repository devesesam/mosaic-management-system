# UI Features Reference

Documentation for user-facing features in the Mosaic Scheduler.

---

## Table of Contents

1. [Global Job Search](#global-job-search)
2. [Jobs to Schedule Pane](#jobs-to-schedule-pane)
3. [Worker Management](#worker-management)
4. [Mobile Optimization](#mobile-optimization)
5. [Calendar Views](#calendar-views)

---

## Global Job Search

### Location
- **Component**: `src/components/scheduler/GlobalJobSearch.tsx`
- **Used in**: `WeekView.tsx`, `MonthView.tsx` (header area)

### Purpose
Allows users to quickly search for any job across the entire database and open its details modal.

### Features
- Search by address, customer name, or quote number
- Dropdown results appear as you type (max 10 results)
- Keyboard navigation:
  - `↑` / `↓` - Navigate results
  - `Enter` - Select highlighted result
  - `Escape` - Close dropdown and clear search
- Click result to open job modal
- Clear button (X) to reset search

### Props
```typescript
interface GlobalJobSearchProps {
  jobs: Job[];                      // All jobs from store
  onJobSelect: (job: Job) => void;  // Callback when job is clicked
}
```

### Usage
```tsx
<GlobalJobSearch
  jobs={jobs}
  onJobSelect={(job) => {
    setSelectedJob(job);
    setIsJobFormOpen(true);
  }}
/>
```

### Styling
- Responsive width: `max-w-xs` (mobile) → `max-w-md` (desktop)
- Uses Tailwind classes for all styling
- Z-index 50 for dropdown overlay

---

## Jobs to Schedule Pane

### Location
- **Component**: `src/components/scheduler/UnscheduledPanel.tsx`

### Purpose
Shows unscheduled jobs that can be dragged onto the calendar.

### What Makes a Job "Unscheduled"?
A job appears in the "Jobs to Schedule" pane if it has **no start date** (`!job.start_date`).

**Important:** Having a worker assigned does NOT affect whether a job is "unscheduled". A job with an assigned worker but no date still needs to be scheduled and will appear in this pane.

```typescript
// Filter logic (UnscheduledPanel.tsx line 42)
const baseUnscheduledJobs = useMemo(() => {
  return jobs.filter(job => !job.start_date);
}, [jobs]);
```

### Common Scenarios
| Job State | Appears in Panel? | Appears on Calendar? |
|-----------|-------------------|---------------------|
| No date, no worker | ✅ Yes | ❌ No |
| No date, has worker | ✅ Yes | ❌ No |
| Has date, no worker | ❌ No | ✅ Yes (Unassigned row) |
| Has date, has worker | ❌ No | ✅ Yes (Worker's row) |

### Features
- **Collapse/Expand**: Click chevron to minimize pane
- **Search**: Filter unscheduled jobs by name/address
- **Color Filter**: Filter by job tile color
- **Drag & Drop**: Drag jobs onto calendar cells
- **localStorage Persistence**: Collapsed state survives page refresh

### Props
```typescript
interface UnscheduledPanelProps {
  jobs: Job[];
  onJobDrop: (job: Job, workerId: string | null, date: Date | null) => void;
  onJobClick: (job: Job) => void;
  readOnly?: boolean;
  isCollapsed?: boolean;           // Collapsed state
  onToggleCollapse?: () => void;   // Toggle callback
}
```

### State Management
```tsx
// In WeekView/MonthView
const [isJobsPaneCollapsed, setIsJobsPaneCollapsed] = useState(() => {
  return localStorage.getItem('jobsPaneCollapsed') === 'true';
});

const toggleJobsPane = () => {
  const newValue = !isJobsPaneCollapsed;
  setIsJobsPaneCollapsed(newValue);
  localStorage.setItem('jobsPaneCollapsed', String(newValue));
};
```

### Mobile Behavior
- Hidden on screens smaller than `md` (768px)
- Use `hidden md:flex` classes

---

## Worker Management

### Location
- **Component**: `src/components/scheduler/WorkerManageModal.tsx`
- **Store**: `src/store/workersStore.ts`
- **Edge Function**: `supabase/functions/update-worker/index.ts`

### Purpose
Manage worker profiles (add, edit, delete).

### Features

#### Edit Worker
- Click pencil icon to enter edit mode
- Inline editing for name and email
- Click checkmark to save, X to cancel
- Changes persist via `updateWorker()` store method

#### Delete Worker
- Click trash icon
- Confirmation modal shows assigned jobs count
- Jobs are unassigned when worker is deleted

### API Integration

#### Update Worker (PUT)
```typescript
// Edge function endpoint
PUT /functions/v1/update-worker

// Request body
{
  "id": "worker-uuid",
  "updates": {
    "name": "New Name",
    "email": "new@email.com"
  }
}

// Response
{
  "success": true,
  "data": { /* updated worker object */ }
}
```

#### Store Method
```typescript
// workersStore.ts
updateWorker: async (id: string, updates: Partial<Worker>) => {
  // Calls edge function
  // Updates local state optimistically
  // Shows toast notification
}
```

### Deployment
```bash
# Deploy the update-worker edge function
supabase functions deploy update-worker
```

---

## Mobile Optimization

### Responsive Breakpoints
Following Tailwind defaults:
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px

### Component-Specific Adjustments

#### CalendarGrid
| Element | Mobile | Tablet | Desktop |
|---------|--------|--------|---------|
| Worker column | `w-24` | `w-32` | `w-48` |
| Worker text | `text-xs` | `text-sm` | `text-base` |
| Day headers | `EEE` format | `EEE` format | `EEE` format |

#### UnscheduledPanel
- Hidden below `md` breakpoint (`hidden md:flex`)
- When visible: fixed `w-[200px]`

#### GlobalJobSearch
- Width: `max-w-xs` → `max-w-sm` → `max-w-md`
- Padding: `pl-8 py-1.5` → `pl-10 py-2`

### Worker Account View
Workers (non-admin users) see:
- Only their own row in the calendar
- No "Jobs to Schedule" pane
- No admin controls
- Week view only (no month toggle)
- Already optimized for mobile (single row)

### Testing Mobile
1. Use browser DevTools responsive mode
2. Test at 375px width (iPhone SE)
3. Test at 768px width (tablet)
4. Verify:
   - Jobs pane is hidden on mobile
   - Calendar is scrollable
   - Search works and dropdown positions correctly
   - Job tiles are tappable

---

## Calendar Views

### Week View
- **Component**: `src/components/scheduler/WeekView.tsx`
- Shows 7-day week (Monday start)
- Navigation: Previous/Next week, Today button
- Global search in header
- Drag-and-drop job scheduling

#### Row Ordering (CalendarGrid)
Team member rows are displayed in a specific order for better usability:

1. **Master Row** - Aggregate view of all jobs (always first, collapsible)
2. **Logged-in User's Row** - Current user's jobs prioritized for quick access
3. **Unassigned Row** - Jobs with dates but no worker assigned
4. **Other Team Members** - Remaining team members sorted alphabetically by name

**Implementation:** `src/components/scheduler/CalendarGrid.tsx`

```typescript
// Current user separated and others sorted alphabetically
const { currentUserMember, otherMembers } = React.useMemo(() => {
  const currentUser = currentWorker ? teamMembers.find(m => m.id === currentWorker.id) : null;
  const others = teamMembers
    .filter(m => !currentWorker || m.id !== currentWorker.id)
    .sort((a, b) => a.name.localeCompare(b.name));
  return { currentUserMember: currentUser, otherMembers: others };
}, [teamMembers, currentWorker]);
```

**Note:** When filtering to a specific team member via the dropdown, only that member's row is shown (with the Unassigned row).

### Month View
- **Component**: `src/components/scheduler/MonthView.tsx`
- Shows full month grid
- Navigation: Previous/Next month, Today button
- Global search in header
- Jobs shown on their start date

### Common Features
- Both views use `CalendarGrid` for worker rows
- Both integrate `UnscheduledPanel` (collapsible)
- Both share `JobForm` modal for job editing
- Collapsed pane state shared via localStorage

---

## Troubleshooting

### Search Not Finding Jobs
- Verify jobs are loaded in store (`jobs.length > 0`)
- Check search is matching `address`, `customer_name`, or `quote_number`
- Ensure dropdown z-index isn't being covered

### Jobs Pane Not Collapsing
- Check `onToggleCollapse` prop is passed
- Verify localStorage is accessible
- Clear localStorage and retry

### Edit Worker Not Saving
- Ensure `update-worker` edge function is deployed
- Check network requests in DevTools
- Verify Supabase API key is valid

### Mobile Layout Issues
- Verify Tailwind responsive classes are applied
- Check for fixed widths that should be responsive
- Test with actual device, not just DevTools

---

## Related Directives

- [Code Standards](./code_standards.md) - Component patterns
- [Utilities](./utilities.md) - Helper functions
- [Troubleshooting](./troubleshooting.md) - General debugging
- [Changelog](./changelog.md) - Feature history
