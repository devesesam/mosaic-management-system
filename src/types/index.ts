export enum JobStatus {
  AwaitingOrder = 'Awaiting Order',
  Ordered = 'Ordered',
  InProgress = 'In Progress',
  HeldUp = 'Held Up',
  Complete = 'Complete',
  Invoiced = 'Invoiced',
  Closed = 'Closed',
  Urgent = 'Urgent'
}

// All users are admins
export type TeamMemberRole = 'admin';

export interface Job {
  id: string;
  address: string;
  customer_name: string | null;
  quote_number: string | null;
  fascia_colour: string | null;
  spouting_colour: string | null;
  spouting_profile: string | null;
  roof_colour: string | null;
  roof_profile: string | null;
  downpipe_size: string | null;
  downpipe_colour: string | null;
  notes: string | null;
  // Note: Database field names kept as worker_id for Supabase compatibility
  worker_id: string | null;
  secondary_worker_ids?: string[];
  start_date: string | null;
  end_date: string | null;
  status: JobStatus;
  tile_color: string | null;
  created_at: string;
}

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