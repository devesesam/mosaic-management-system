/**
 * Centralized error handling utilities
 */

export class AppError extends Error {
  public readonly code: string;
  public readonly isRetryable: boolean;

  constructor(message: string, code: string, isRetryable = false) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.isRetryable = isRetryable;
  }
}

/**
 * Common error codes
 */
export const ErrorCodes = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  UNAUTHORIZED: 'UNAUTHORIZED',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  UNKNOWN: 'UNKNOWN',
} as const;

/**
 * Converts unknown errors to AppError with appropriate classification
 */
export const handleApiError = (error: unknown): AppError => {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Network errors (usually retryable)
    if (message.includes('network') || message.includes('fetch')) {
      return new AppError(
        'Network error. Please check your connection.',
        ErrorCodes.NETWORK_ERROR,
        true
      );
    }

    // Timeout errors (usually retryable)
    if (message.includes('timeout') || message.includes('timed out')) {
      return new AppError(
        'Request timed out. Please try again.',
        ErrorCodes.TIMEOUT,
        true
      );
    }

    // HTTP status codes
    if (message.includes('401') || message.includes('unauthorized')) {
      return new AppError(
        'You are not authorized to perform this action.',
        ErrorCodes.UNAUTHORIZED,
        false
      );
    }

    if (message.includes('404') || message.includes('not found')) {
      return new AppError(
        'The requested resource was not found.',
        ErrorCodes.NOT_FOUND,
        false
      );
    }

    if (message.includes('500') || message.includes('server error')) {
      return new AppError(
        'Server error. Please try again later.',
        ErrorCodes.SERVER_ERROR,
        true
      );
    }

    // Return the original message for other errors
    return new AppError(error.message, ErrorCodes.UNKNOWN, false);
  }

  // Fallback for non-Error types
  return new AppError(
    'An unexpected error occurred.',
    ErrorCodes.UNKNOWN,
    false
  );
};

/**
 * Get a user-friendly error message
 */
export const getUserFriendlyMessage = (error: unknown): string => {
  const appError = handleApiError(error);
  return appError.message;
};
