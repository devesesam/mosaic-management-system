# Deployment Guide

This guide documents the deployment workflows for the Tasman Roofing Scheduler.

## Architecture

- **Frontend**: Hosted on [Netlify](https://app.netlify.com/projects/teal-eclair-7a0089/overview)
- **Backend/Database**: [Supabase](https://supabase.com/dashboard/project/qkclmypehdlyhwxhxyue)
- **Repository**: [GitHub](https://github.com/devesesam/mosaic-management-system)

---

## 🚀 Production Deployment

The production site is automatically deployed whenever code is pushed to the `master` branch.

### How to Deploy
1.  **Commit your changes:**
    ```bash
    git add .
    git commit -m "feat: description of changes"
    ```
2.  **Push to `master`:**
    ```bash
    git push origin master
    ```
3.  **Monitor Deploy:**
    - Netlify will detect the push and start building.
    - Check status at: [Netlify Deploys](https://app.netlify.com/sites/teal-eclair-7a0089/deploys)

---

## 🛡️ Safe Development Workflow (Feature Branches)

For complex changes or risky updates, **DO NOT** push directly to `master`. Use this workflow instead:

1.  **Create a Feature Branch:**
    ```bash
    git checkout -b feature/my-new-feature
    ```
2.  **Make Changes & Commit.**
3.  **Push Branch:**
    ```bash
    git push origin feature/my-new-feature
    ```
4.  **Create Pull Request:**
    - Go to GitHub and open a Pull Request (PR).
5.  **Test on Deploy Preview:**
    - Netlify will automatically build a **Deploy Preview URL** for your PR.
    - Look for the "Deploy preview ready!" comment on the PR.
    - Click "Details" to view the live preview site.
    - **Note:** This preview connects to the **production database**, so be careful with data!
6.  **Merge:**
    - Once tested and approved, merge the PR into `master`.
    - This triggers the production deploy.

---

## 🗄️ Database Migrations

Database changes (tables, columns, policies) are managed via Supabase Migrations.

### Applying Migrations
Since we do not have direct CLI access to the production database password in this environment, migration SQL files must be run manually in the Dashboard.

1.  **Locate Migration File:**
    - Check `supabase/migrations/` for new `.sql` files.
2.  **Open Supabase Dashboard:**
    - Go to [Supabase SQL Editor](https://supabase.com/dashboard/project/qkclmypehdlyhwxhxyue/sql).
3.  **Run SQL:**
    - Copy the contents of the migration file.
    - Paste into a "New Query".
    - Click **Run**.

---

## ⚡ Edge Functions

Edge Functions (e.g., `update-worker`) must be deployed separately via the Supabase CLI.

### How to Deploy
```bash
# Deploy a specific function
npx supabase functions deploy update-worker --project-ref qkclmypehdlyhwxhxyue

# Deploy all functions
npx supabase functions deploy --project-ref qkclmypehdlyhwxhxyue
```

> **Note:** You may need to link the project first:
> `npx supabase link --project-ref qkclmypehdlyhwxhxyue`

---

## 🔒 Environment Variables

Environment variables are managed in two places:

1.  **Local Development:** `.env` file
2.  **Production:** Netlify Site Settings > **Environment variables**

### Required Variables
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_ADMIN_EMAILS` (Fallback only; primary source of truth is `admin_users` table)
- `VITE_LOG_LEVEL` (default: `warn`)
