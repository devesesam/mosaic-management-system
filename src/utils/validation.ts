/**
 * Form validation utilities
 */

export type ValidationResult = string | null;

export const validators = {
  /**
   * Validates that a field has a non-empty value
   */
  required: (value: string | null | undefined): ValidationResult => {
    return value?.trim() ? null : 'This field is required';
  },

  /**
   * Validates email format
   */
  email: (value: string | null | undefined): ValidationResult => {
    if (!value) return null; // Empty is OK (use required for mandatory)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value) ? null : 'Invalid email format';
  },

  /**
   * Validates phone number format (allows digits, spaces, +, -, parentheses)
   */
  phone: (value: string | null | undefined): ValidationResult => {
    if (!value) return null; // Empty is OK
    const phoneRegex = /^[\d\s+\-()]+$/;
    return phoneRegex.test(value) ? null : 'Invalid phone format';
  },

  /**
   * Validates that end date is on or after start date
   */
  dateRange: (startDate: string | null, endDate: string | null): ValidationResult => {
    if (!startDate || !endDate) return null; // Empty is OK
    const start = new Date(startDate);
    const end = new Date(endDate);
    return end >= start ? null : 'End date must be on or after start date';
  },

  /**
   * Validates maximum character length
   */
  maxLength: (max: number) => (value: string | null | undefined): ValidationResult => {
    if (!value) return null;
    return value.length <= max ? null : `Maximum ${max} characters allowed`;
  },

  /**
   * Validates minimum character length
   */
  minLength: (min: number) => (value: string | null | undefined): ValidationResult => {
    if (!value) return null;
    return value.length >= min ? null : `Minimum ${min} characters required`;
  },
};

/**
 * Runs multiple validators on a value and returns the first error
 */
export const validate = (
  value: string | null | undefined,
  ...validatorFns: Array<(val: string | null | undefined) => ValidationResult>
): ValidationResult => {
  for (const fn of validatorFns) {
    const result = fn(value);
    if (result) return result;
  }
  return null;
};

/**
 * Validates an entire form and returns all errors
 */
export const validateForm = <T extends Record<string, unknown>>(
  data: T,
  rules: Partial<Record<keyof T, Array<(val: unknown) => ValidationResult>>>
): Partial<Record<keyof T, string>> => {
  const errors: Partial<Record<keyof T, string>> = {};

  for (const [field, validators] of Object.entries(rules)) {
    if (!validators) continue;

    for (const validator of validators) {
      const error = validator(data[field as keyof T]);
      if (error) {
        errors[field as keyof T] = error;
        break;
      }
    }
  }

  return errors;
};
