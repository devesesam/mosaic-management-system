# Execution

This directory contains deterministic scripts used by the agent to perform work.

---

## Python Scripts
Python scripts in this directory should be:
- Reliable and testable
- Fast to execute
- Environment-agnostic (use `.env` for configuration)

Environment variables and API tokens should be stored in the root `.env` file, not hardcoded.

---

## TypeScript Utilities

For the frontend React application, execution-layer utilities are located in `src/utils/`:

| File | Purpose | Documentation |
|------|---------|---------------|
| `logger.ts` | Configurable logging | [utilities.md](../directives/utilities.md#logger) |
| `validation.ts` | Form validation | [utilities.md](../directives/utilities.md#validation) |
| `errors.ts` | Error handling | [utilities.md](../directives/utilities.md#error-handling) |
| `debounce.ts` | Rate limiting | [utilities.md](../directives/utilities.md#debounce) |

These utilities follow the same principles:
- Deterministic behavior
- Well-typed TypeScript
- No side effects (except logger output)
- Thoroughly documented

---

## Adding New Execution Scripts

### Python Scripts
```python
#!/usr/bin/env python3
"""
Script description and purpose.

Usage:
    python script_name.py [arguments]

Environment Variables:
    VAR_NAME: Description
"""

import os
from dotenv import load_dotenv

load_dotenv()

def main():
    # Implementation
    pass

if __name__ == "__main__":
    main()
```

### TypeScript Utilities
See [directives/utilities.md](../directives/utilities.md) for guidelines on adding new utilities.
