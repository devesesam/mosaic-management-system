export enum TaskStatus {
  NotStarted = 'Not Started',
  InProgress = 'In Progress',
  OnHold = 'On Hold',
  Completed = 'Completed'
}

// Backwards compatibility alias
export const JobStatus = TaskStatus;
export type JobStatus = TaskStatus;

// All users are admins
export type TeamMemberRole = 'admin';

export interface Task {
  id: string;
  name: string;
  notes: string | null;
  worker_id: string | null;
  secondary_worker_ids?: string[];
  start_date: string | null;
  end_date: string | null;
  status: TaskStatus;
  tile_color: string | null;
  created_at: string;
}

// Backwards compatibility alias
export type Job = Task;

export interface TeamMember {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role?: TeamMemberRole;
  created_at: string;
}

// Alias for backwards compatibility during migration
export type Worker = TeamMember;

export interface User {
  id: string;
  email: string;
}