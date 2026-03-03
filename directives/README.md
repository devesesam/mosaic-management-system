# Directives

This directory contains Standard Operating Procedures (SOPs) written in Markdown.
These files define the goals, inputs, tools/scripts to use, outputs, and edge cases for various tasks.
They act as the "instruction set" for AI agents working on this project.

---

## Current Version: 0.2.0

**Latest Update (2026-03-03):** Major refactoring from "job" to "task" terminology. See [changelog.md](./changelog.md) for details.

---

## Available Directives

| File | Purpose |
|------|---------|
| [project_overview.md](./project_overview.md) | Project architecture, tech stack, and getting started |
| [code_standards.md](./code_standards.md) | Coding conventions, patterns, and best practices |
| [performance.md](./performance.md) | Performance optimization: realtime, React.memo, selectors |
| [brand_guidelines.md](./brand_guidelines.md) | Mosaic brand colors, typography, and usage patterns |
| [utilities.md](./utilities.md) | Documentation for `src/utils/` functions |
| [ui_features.md](./ui_features.md) | UI components, features, and mobile optimization |
| [deployment.md](./deployment.md) | Deployment guide for Netlify and Supabase |
| [changelog.md](./changelog.md) | History of changes and improvements |
| [troubleshooting.md](./troubleshooting.md) | Common issues and solutions |

---

## Quick Reference

### For New Agents
1. Start with [project_overview.md](./project_overview.md) to understand the architecture
2. Review [code_standards.md](./code_standards.md) before writing code
3. **Important:** Use "Task" terminology throughout (not "Job") - see code_standards.md
4. Review [brand_guidelines.md](./brand_guidelines.md) for colors and typography
5. Review [performance.md](./performance.md) for optimization patterns (realtime, memoization)
6. Use [utilities.md](./utilities.md) when implementing features
7. Check [troubleshooting.md](./troubleshooting.md) when debugging issues

### For Ongoing Development
1. Follow patterns in [code_standards.md](./code_standards.md)
2. Document changes in [changelog.md](./changelog.md)
3. Update [troubleshooting.md](./troubleshooting.md) when new issues are discovered
4. Use `Task`, `TaskStatus`, `useTasksStore` (not legacy `Job` names)

### For Codebase Maintenance
1. See **Dead Code Prevention** in [code_standards.md](./code_standards.md)
2. See **Codebase Maintenance Issues** in [troubleshooting.md](./troubleshooting.md)
3. Document all file removals in [changelog.md](./changelog.md)
4. Always verify with `npm run build` after deletions

### For Migration Issues (v0.2.0)
1. See **Migration Issues** section in [troubleshooting.md](./troubleshooting.md)
2. See **v0.2.0 Migration Guide** in [changelog.md](./changelog.md)
3. Database tables: `tasks`, `task_secondary_workers` (not `jobs`, `job_secondary_workers`)
4. Edge functions: `get-tasks`, `add-task`, etc. (not `get-jobs`, `add-job`)

---

## DOE Framework Integration

These directives are Layer 1 (Directive) of the DOE framework:

```
┌─────────────────────────────────────────────────────┐
│ Layer 1: Directives (This Directory)                │
│ - SOPs and documentation                            │
│ - Define what to do and how                         │
└─────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────┐
│ Layer 2: Orchestration (AI Agent)                   │
│ - Reads directives                                  │
│ - Makes decisions                                   │
│ - Calls execution tools                             │
└─────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────┐
│ Layer 3: Execution (Scripts & Code)                 │
│ - Python scripts in execution/                      │
│ - TypeScript utilities in src/utils/                │
│ - Deterministic, testable operations                │
└─────────────────────────────────────────────────────┘
```

---

## Maintaining Directives

### When to Update
- After completing a significant task
- When discovering new patterns or issues
- When adding new utilities or features
- When fixing bugs (document in changelog)

### Update Guidelines
- Keep language clear and concise
- Include code examples where helpful
- Update table of contents if adding new files
- Cross-reference related directives

### Creating New Directives
```markdown
# Directive Name

## Overview
Brief description of what this directive covers.

## Goals
- Goal 1
- Goal 2

## Inputs
What information/resources are needed.

## Process
Step-by-step instructions.

## Outputs
Expected results.

## Edge Cases
Special situations to handle.

## Related
Links to related directives.
```
