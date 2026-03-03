import { z } from 'zod';
import { TaskStatus } from '../types';

/**
 * Zod schema for task form validation
 * Provides type-safe validation with clear error messages
 */
export const taskFormSchema = z.object({
  name: z
    .string()
    .min(1, 'Task name is required')
    .max(200, 'Task name must be 200 characters or less'),

  notes: z
    .string()
    .max(2000, 'Notes must be 2000 characters or less')
    .nullable()
    .optional(),

  worker_id: z
    .string()
    .uuid('Invalid team member ID')
    .nullable()
    .optional(),

  secondary_worker_ids: z
    .array(z.string().uuid())
    .default([]),

  start_date: z
    .string()
    .datetime({ message: 'Invalid start date' })
    .nullable()
    .optional(),

  end_date: z
    .string()
    .datetime({ message: 'Invalid end date' })
    .nullable()
    .optional(),

  status: z.nativeEnum(TaskStatus).default(TaskStatus.NotStarted),

  tile_color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format')
    .default('#345981'),

  is_visible: z.boolean().default(true),
}).refine(
  (data) => {
    // If both dates exist, end_date must be >= start_date
    if (data.start_date && data.end_date) {
      return new Date(data.end_date) >= new Date(data.start_date);
    }
    return true;
  },
  {
    message: 'End date must be on or after start date',
    path: ['end_date'],
  }
).refine(
  (data) => {
    // If no primary worker, secondary workers must be empty
    if (!data.worker_id && data.secondary_worker_ids.length > 0) {
      return false;
    }
    return true;
  },
  {
    message: 'Cannot have secondary workers without a primary worker',
    path: ['secondary_worker_ids'],
  }
);

// Type inferred from schema
export type TaskFormData = z.infer<typeof taskFormSchema>;

// Schema for team member form
export const teamMemberFormSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be 100 characters or less'),

  email: z
    .string()
    .email('Invalid email format')
    .nullable()
    .optional()
    .or(z.literal('')),

  phone: z
    .string()
    .regex(/^[\d\s+\-()]*$/, 'Invalid phone format')
    .nullable()
    .optional()
    .or(z.literal('')),
});

export type TeamMemberFormData = z.infer<typeof teamMemberFormSchema>;

/**
 * Helper to validate task form data and return errors
 */
export function validateTaskForm(data: unknown): { success: true; data: TaskFormData } | { success: false; errors: Record<string, string> } {
  const result = taskFormSchema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  // Convert Zod errors to simple key-value pairs
  const errors: Record<string, string> = {};
  for (const error of result.error.errors) {
    const path = error.path.join('.');
    if (!errors[path]) {
      errors[path] = error.message;
    }
  }

  return { success: false, errors };
}

/**
 * Helper to validate team member form data
 */
export function validateTeamMemberForm(data: unknown): { success: true; data: TeamMemberFormData } | { success: false; errors: Record<string, string> } {
  const result = teamMemberFormSchema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors: Record<string, string> = {};
  for (const error of result.error.errors) {
    const path = error.path.join('.');
    if (!errors[path]) {
      errors[path] = error.message;
    }
  }

  return { success: false, errors };
}
