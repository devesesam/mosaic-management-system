# Troubleshooting Guide

Common issues, their causes, and solutions for the Tasman Roofing Scheduler.

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
1. Add email to `VITE_ADMIN_EMAILS` in `.env`:
   ```bash
   VITE_ADMIN_EMAILS=existing@email.com,new@email.com
   ```
2. Restart the server
3. User must log out and log back in

**Debug:** Check `VITE_LOG_LEVEL=debug` to see permission check logs

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

### Issue: Jobs/Workers Not Loading

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

**Symptom:** Created/updated job doesn't appear

**Cause:** Usually stale state or failed API call

**Solutions:**
1. Check for error toasts
2. Refresh the page (data refreshes every 60 seconds)
3. Check browser console for errors
4. Verify the operation succeeded in Supabase dashboard

---

### Issue: Duplicate Jobs/Workers Appearing

**Symptom:** Same item appears multiple times

**Cause:** Usually a state management bug or double-submit

**Solutions:**
1. Check if form submission button is disabled during submit
2. Look for race conditions in useEffect hooks
3. Clear state and refresh

---

## UI Feature Issues

### Issue: Global Search Not Finding Jobs

**Symptom:** Typing in search bar shows no results

**Possible Causes:**
1. Jobs array is empty
2. Search term doesn't match address, customer_name, or quote_number
3. Component not receiving jobs prop

**Debug Steps:**
1. Open browser console
2. Check if jobs are loaded (look for `Jobs loaded: N` messages)
3. Verify search matches expected fields

**Solutions:**
1. Ensure jobs are loaded before searching
2. Check spelling in search term
3. Verify `jobs` prop is passed to `GlobalJobSearch`

---

### Issue: Jobs Pane Won't Collapse/Expand

**Symptom:** Clicking collapse button does nothing

**Possible Causes:**
1. `onToggleCollapse` prop not passed
2. localStorage not accessible
3. State not updating

**Solutions:**
1. Verify `onToggleCollapse={toggleJobsPane}` in WeekView/MonthView
2. Try clearing localStorage: `localStorage.removeItem('jobsPaneCollapsed')`
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

## Performance Issues

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

### Issue: UI Lag When Dragging Jobs

**Symptom:** Stuttering during drag-and-drop

**Causes:**
1. Too many re-renders
2. Large DOM tree in month view

**Solutions:**
1. Use React DevTools Profiler to find bottlenecks
2. Consider virtualization for large job lists
3. Memoize expensive computations

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

**How to Verify:**
```bash
# Check if a file is imported anywhere
grep -r "import.*FileName" src/
grep -r "from.*fileName" src/

# If no matches found = file is dead code (safe to delete)
```

**Common Dead Code Patterns:**
1. **Debug modals** - Created during development, never wired to UI
2. **Abandoned hooks** - React Query hooks when app uses Zustand
3. **Parallel stores** - Multiple stores for same data (e.g., `jobStore.ts` vs `jobsStore.ts`)
4. **Unused API layers** - API files that nothing imports

**Safe Deletion Process:**
1. Search for all imports of the file
2. If 0 imports → file never runs
3. Delete the file
4. Run `npm run build` to verify no breakage
5. Document in changelog

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
