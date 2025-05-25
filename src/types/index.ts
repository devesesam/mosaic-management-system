export enum JobStatus {
  AwaitingOrder = 'Awaiting Order',
  Ordered = 'Ordered',
  InProgress = 'In Progress',
  HeldUp = 'Held Up',
  Complete = 'Complete',
  Invoiced = 'Invoiced',
  Closed = 'Closed'
}

// Everyone is now admin - no different roles
export type WorkerRole = 'admin';

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
  worker_id: string | null;
  secondary_worker_ids?: string[];
  start_date: string | null;
  end_date: string | null;
  status: JobStatus;
  tile_color: string | null;
  created_at: string;
}

export interface Worker {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role?: WorkerRole;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
}