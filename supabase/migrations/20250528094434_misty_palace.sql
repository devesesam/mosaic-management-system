/*
  # Add complete test data

  1. Create a sample worker with complete information
  2. Create sample jobs with dates, complete information, and proper assignment
  3. Add secondary worker assignments
*/

-- Insert complete test worker if workers table is empty
DO $$
BEGIN
  -- Only insert if no workers exist
  IF NOT EXISTS (SELECT 1 FROM public.workers LIMIT 1) THEN
    INSERT INTO public.workers (id, name, email, phone, role, created_at)
    VALUES 
      ('00000000-0000-4000-a000-000000000001', 'John Smith', 'john@tasmanroofing.com', '021-555-1234', 'admin', now()),
      ('00000000-0000-4000-a000-000000000002', 'Sarah Johnson', 'sarah@tasmanroofing.com', '021-555-5678', 'admin', now());
  END IF;
END $$;

-- Insert complete test jobs with proper dates and details
DO $$
DECLARE
  worker1_id uuid := '00000000-0000-4000-a000-000000000001';
  worker2_id uuid := '00000000-0000-4000-a000-000000000002';
  job1_id uuid;
  job2_id uuid;
  job3_id uuid;
  job4_id uuid;
  current_date date := current_date;
  -- Calculate dates relative to current date
  this_monday date := current_date - EXTRACT(DOW FROM current_date)::int + 1;
  this_wednesday date := this_monday + 2;
  this_friday date := this_monday + 4;
  next_monday date := this_monday + 7;
  next_wednesday date := this_monday + 9;
  next_friday date := this_monday + 11;
BEGIN
  -- Only insert if no jobs exist
  IF NOT EXISTS (SELECT 1 FROM public.jobs LIMIT 1) THEN
    -- Create a job assigned to worker 1 that spans Monday-Wednesday of this week (shows in calendar)
    INSERT INTO public.jobs (
      id, address, customer_name, quote_number, 
      fascia_colour, spouting_colour, spouting_profile, 
      roof_colour, roof_profile, downpipe_size, downpipe_colour,
      notes, worker_id, start_date, end_date, status, tile_color, created_at
    )
    VALUES (
      '00000000-0000-4000-b000-000000000001',
      '123 Main Street, Wellington', 
      'Michael Brown',
      'Q12345',
      'White', 'White', 'Quarter Round',
      'Grey', 'Corrugated', '80mm', 'White',
      'Customer prefers work done early in the morning',
      worker1_id,
      (this_monday + ' 09:00:00')::timestamptz,
      (this_wednesday + ' 17:00:00')::timestamptz,
      'In Progress',
      '#3b82f6',  -- blue
      now() - interval '2 days'
    )
    RETURNING id INTO job1_id;
    
    -- Create a job assigned to worker 2 for Friday this week (shows in calendar)
    INSERT INTO public.jobs (
      id, address, customer_name, quote_number, 
      fascia_colour, spouting_colour, spouting_profile, 
      roof_colour, roof_profile, downpipe_size, downpipe_colour,
      notes, worker_id, start_date, end_date, status, tile_color, created_at
    )
    VALUES (
      '00000000-0000-4000-b000-000000000002',
      '456 High Street, Wellington', 
      'Jennifer Wilson',
      'Q23456',
      'Cream', 'Cream', 'Half Round',
      'Brown', 'Tile', '100mm', 'Brown',
      'Access through side gate',
      worker2_id,
      (this_friday + ' 09:00:00')::timestamptz,
      (this_friday + ' 17:00:00')::timestamptz,
      'Ordered',
      '#f97316',  -- orange
      now() - interval '1 day'
    )
    RETURNING id INTO job2_id;
    
    -- Create a job for next week that spans multiple days (shows in calendar)
    INSERT INTO public.jobs (
      id, address, customer_name, quote_number, 
      fascia_colour, spouting_colour, spouting_profile, 
      roof_colour, roof_profile, downpipe_size, downpipe_colour,
      notes, worker_id, start_date, end_date, status, tile_color, created_at
    )
    VALUES (
      '00000000-0000-4000-b000-000000000003',
      '789 Beach Road, Wellington', 
      'Robert Taylor',
      'Q34567',
      'Green', 'Green', 'Box',
      'Black', 'Metal', '80mm', 'Black',
      'Large job, will require multiple days',
      worker1_id,
      (next_monday + ' 09:00:00')::timestamptz,
      (next_friday + ' 17:00:00')::timestamptz,
      'Awaiting Order',
      '#22c55e',  -- green
      now()
    )
    RETURNING id INTO job3_id;
    
    -- Create an unscheduled job (shows in the unscheduled jobs panel)
    INSERT INTO public.jobs (
      id, address, customer_name, quote_number, 
      fascia_colour, spouting_colour, spouting_profile, 
      roof_colour, roof_profile, downpipe_size, downpipe_colour,
      notes, worker_id, start_date, end_date, status, tile_color, created_at
    )
    VALUES (
      '00000000-0000-4000-b000-000000000004',
      '321 Valley Way, Wellington', 
      'Elizabeth Moore',
      'Q45678',
      'Black', 'Black', 'Half Round',
      'Red', 'Corrugated', '100mm', 'Black',
      'Waiting for customer confirmation',
      NULL,
      NULL,
      NULL,
      'Awaiting Order',
      '#ef4444',  -- red
      now() - interval '3 days'
    )
    RETURNING id INTO job4_id;
    
    -- Add secondary worker assignments
    INSERT INTO public.job_secondary_workers (job_id, worker_id)
    VALUES
      (job1_id, worker2_id),  -- Add worker 2 as secondary to job 1
      (job3_id, worker2_id);  -- Add worker 2 as secondary to job 3
  END IF;
END $$;