/**
 * Utility functions for the Tasman Roofing Scheduler
 *
 * Documentation: directives/utilities.md
 */

// Logging
export { logger } from './logger';

// Validation
export {
  validators,
  validate,
  validateForm,
  type ValidationResult,
} from './validation';

// Error Handling
export {
  AppError,
  ErrorCodes,
  handleApiError,
  getUserFriendlyMessage,
} from './errors';

// Performance
export { debounce, throttle } from './debounce';
