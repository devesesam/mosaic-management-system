# Utilities Reference

## Overview
The `src/utils/` directory contains reusable utility functions for logging, validation, error handling, and performance optimization.

---

## Logger (`src/utils/logger.ts`)

### Purpose
Centralized logging with configurable log levels. Replaces all `console.log` statements.

### Configuration
Set `VITE_LOG_LEVEL` in `.env`:
- `debug` - All messages (development)
- `info` - Info, warnings, and errors
- `warn` - Warnings and errors (production recommended)
- `error` - Errors only

### API

```typescript
import { logger } from '../utils/logger';

// Debug level - verbose information
logger.debug('Message', optionalData);

// Info level - significant events
logger.info('Message', optionalData);

// Warning level - potential issues
logger.warn('Message', optionalData);

// Error level - always shown
logger.error('Message', optionalData);
```

### Output Format
```
[DEBUG] ComponentName: Action performed { data: ... }
[INFO] ComponentName: Event occurred
[WARN] ComponentName: Potential issue
[ERROR] ComponentName: Error message
```

### Best Practices
- Always prefix with component/module name
- Pass relevant data as second argument
- Use `debug` for trace-level info that helps debugging
- Use `error` for failures that need attention

---

## Validation (`src/utils/validation.ts`)

### Purpose
Form validation utilities for consistent input validation across the app.

### Validators

#### `validators.required(value)`
Checks if a value is non-empty after trimming.

```typescript
const error = validators.required(formData.name);
// Returns: null | 'This field is required'
```

#### `validators.email(value)`
Validates email format. Empty values pass (use `required` for mandatory).

```typescript
const error = validators.email(formData.email);
// Returns: null | 'Invalid email format'
```

#### `validators.phone(value)`
Validates phone format (digits, spaces, +, -, parentheses).

```typescript
const error = validators.phone(formData.phone);
// Returns: null | 'Invalid phone format'
```

#### `validators.dateRange(startDate, endDate)`
Validates that end date is on or after start date.

```typescript
const error = validators.dateRange(formData.start_date, formData.end_date);
// Returns: null | 'End date must be on or after start date'
```

#### `validators.maxLength(max)(value)`
Factory function for maximum length validation.

```typescript
const error = validators.maxLength(100)(formData.notes);
// Returns: null | 'Maximum 100 characters allowed'
```

#### `validators.minLength(min)(value)`
Factory function for minimum length validation.

```typescript
const error = validators.minLength(3)(formData.name);
// Returns: null | 'Minimum 3 characters required'
```

### Helper Functions

#### `validate(value, ...validators)`
Run multiple validators, returns first error.

```typescript
import { validate, validators } from '../utils/validation';

const error = validate(
  formData.email,
  validators.required,
  validators.email
);
```

#### `validateForm(data, rules)`
Validate entire form object, returns all errors.

```typescript
const errors = validateForm(formData, {
  name: [validators.required, validators.maxLength(50)],
  email: [validators.required, validators.email],
});
// Returns: { name?: string, email?: string }
```

---

## Error Handling (`src/utils/errors.ts`)

### Purpose
Centralized error handling with classification and user-friendly messages.

### AppError Class

```typescript
import { AppError, ErrorCodes } from '../utils/errors';

// Create a custom error
throw new AppError('Custom message', ErrorCodes.VALIDATION_ERROR, false);

// Properties:
// - message: string - User-friendly message
// - code: string - Error code for programmatic handling
// - isRetryable: boolean - Whether operation can be retried
```

### Error Codes

| Code | Description | Retryable |
|------|-------------|-----------|
| `NETWORK_ERROR` | Network connectivity issues | Yes |
| `TIMEOUT` | Request timed out | Yes |
| `UNAUTHORIZED` | Authentication/authorization failure | No |
| `NOT_FOUND` | Resource not found | No |
| `VALIDATION_ERROR` | Input validation failure | No |
| `SERVER_ERROR` | Server-side error (500) | Yes |
| `UNKNOWN` | Unclassified error | No |

### handleApiError(error)
Converts any error to an AppError with appropriate classification.

```typescript
import { handleApiError } from '../utils/errors';

try {
  await apiCall();
} catch (error) {
  const appError = handleApiError(error);

  if (appError.isRetryable) {
    // Implement retry logic
    await retry(apiCall);
  } else {
    // Show error to user
    toast.error(appError.message);
  }
}
```

### getUserFriendlyMessage(error)
Quick helper to get a user-friendly message from any error.

```typescript
import { getUserFriendlyMessage } from '../utils/errors';

const message = getUserFriendlyMessage(error);
toast.error(message);
```

---

## Debounce (`src/utils/debounce.ts`)

### Purpose
Rate-limiting utilities to prevent excessive function calls.

### debounce(fn, delay)
Delays function execution until after `delay` ms have elapsed since the last call.

```typescript
import { debounce } from '../utils/debounce';

// Create debounced function
const debouncedSearch = debounce((query: string) => {
  performSearch(query);
}, 300);

// Usage - only executes 300ms after last call
input.onChange = (e) => debouncedSearch(e.target.value);
```

### throttle(fn, limit)
Ensures function executes at most once per `limit` ms.

```typescript
import { throttle } from '../utils/debounce';

// Create throttled function
const throttledScroll = throttle(() => {
  updateScrollPosition();
}, 100);

// Usage - executes at most every 100ms
window.onscroll = throttledScroll;
```

### Use Cases

| Function | Use Case |
|----------|----------|
| `debounce` | Search inputs, form auto-save, resize handlers |
| `throttle` | Scroll handlers, mouse move, continuous events |

---

## Adding New Utilities

When adding new utilities:

1. Create file in `src/utils/`
2. Export functions/classes
3. Add TypeScript types
4. Document in this file
5. Add usage examples in `directives/code_standards.md`

Example structure:
```typescript
// src/utils/newUtility.ts

/**
 * Description of what this utility does
 */
export const myUtility = (param: ParamType): ReturnType => {
  // Implementation
};

export default myUtility;
```
