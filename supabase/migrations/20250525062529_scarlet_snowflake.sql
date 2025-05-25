/*
  # Add sample data for testing

  1. New Data
    - Sample workers with different roles
    - Sample jobs with various statuses and properties
    - Scheduled and unscheduled jobs
  2. Changes
    - Ensures the admin account (damsevese@gmail.com) exists
*/

-- First ensure our admin account exists and has proper permissions
INSERT INTO workers (name, email, role)
VALUES (
  'Admin User',
  'damsevese@gmail.com',
  'admin'
)
ON CONFLICT (email) 
DO UPDATE SET 
  role = 'admin',
  name = COALESCE(workers.name, 'Admin User');

-- Add sample workers
INSERT INTO workers (name, email, phone, role)
VALUES 
  ('John Smith', 'john@example.com', '022-123-4567', 'admin'),
  ('Sarah Johnson', 'sarah@example.com', '021-987-6543', 'viewer'),
  ('Mike Taylor', 'mike@example.com', '027-555-1234', 'admin'),
  ('Lisa Brown', 'lisa@example.com', '029-444-5555', 'viewer')
ON CONFLICT (email) DO NOTHING;

-- Get worker IDs for reference (safely)
DO $$
DECLARE
  admin1_id UUID;
  admin2_id UUID;
  viewer1_id UUID;
  viewer2_id UUID;
BEGIN
  -- Get worker IDs
  SELECT id INTO admin1_id FROM workers WHERE email = 'john@example.com';
  SELECT id INTO admin2_id FROM workers WHERE email = 'mike@example.com';
  SELECT id INTO viewer1_id FROM workers WHERE email = 'sarah@example.com';
  SELECT id INTO viewer2_id FROM workers WHERE email = 'lisa@example.com';
  
  -- Add sample jobs - Scheduled jobs
  INSERT INTO jobs (
    address, 
    customer_name, 
    quote_number, 
    fascia_colour, 
    spouting_colour, 
    spouting_profile, 
    roof_colour, 
    roof_profile, 
    downpipe_size, 
    downpipe_colour, 
    notes, 
    worker_id, 
    start_date, 
    end_date, 
    status, 
    tile_color
  )
  VALUES
    -- Job 1: In progress, multi-day
    (
      '123 Main Street, Wellington', 
      'James Wilson', 
      'Q-2025-001', 
      'Grey', 
      'Grey', 
      'Half Round', 
      'Colorsteel', 
      'Corrugate', 
      '80mm', 
      'Grey', 
      'Customer requested completion before end of month. Access via driveway.', 
      admin1_id, 
      (CURRENT_DATE + INTERVAL '3 days')::TIMESTAMP, 
      (CURRENT_DATE + INTERVAL '5 days')::TIMESTAMP, 
      'In Progress', 
      '#22c55e'
    ),
    -- Job 2: Awaiting order
    (
      '45 Beach Road, Auckland', 
      'Sarah Thompson', 
      'Q-2025-002', 
      'White', 
      'White', 
      'Box', 
      'Colorsteel', 
      'Tray', 
      '65mm', 
      'White', 
      'New build, coordinate with building contractor.', 
      admin1_id, 
      (CURRENT_DATE + INTERVAL '10 days')::TIMESTAMP, 
      (CURRENT_DATE + INTERVAL '12 days')::TIMESTAMP, 
      'Awaiting Order', 
      '#3b82f6'
    ),
    -- Job 3: Completed job
    (
      '78 Hill View Terrace, Christchurch', 
      'David Chen', 
      'Q-2025-003', 
      'Brown', 
      'Brown', 
      'Half Round', 
      'Colorsteel', 
      'Corrugate', 
      '80mm', 
      'Brown', 
      'Final inspection completed. Customer very satisfied.', 
      admin2_id, 
      (CURRENT_DATE - INTERVAL '5 days')::TIMESTAMP, 
      (CURRENT_DATE - INTERVAL '3 days')::TIMESTAMP, 
      'Complete', 
      '#8b5cf6'
    ),
    -- Job 4: Future job
    (
      '12 Riverside Drive, Hamilton', 
      'Emma Williams', 
      'Q-2025-004', 
      'Black', 
      'Black', 
      'Box', 
      'Colorsteel', 
      'Tray', 
      '65mm', 
      'Black', 
      'Customer requesting specific completion time frame. Has existing leak.', 
      admin2_id, 
      (CURRENT_DATE + INTERVAL '15 days')::TIMESTAMP, 
      (CURRENT_DATE + INTERVAL '17 days')::TIMESTAMP, 
      'Ordered', 
      '#f97316'
    ),
    -- Job 5: Held up
    (
      '89 Queen Street, Dunedin', 
      'Robert Johnson', 
      'Q-2025-005', 
      'Green', 
      'Green', 
      'Half Round', 
      'Colorsteel', 
      'Corrugate', 
      '80mm', 
      'Green', 
      'Material delivery delayed. Customer informed.', 
      admin1_id, 
      (CURRENT_DATE + INTERVAL '7 days')::TIMESTAMP, 
      (CURRENT_DATE + INTERVAL '9 days')::TIMESTAMP, 
      'Held Up', 
      '#ef4444'
    );

  -- Add unscheduled jobs (no dates or assigned workers)
  INSERT INTO jobs (
    address, 
    customer_name, 
    quote_number, 
    fascia_colour, 
    spouting_colour, 
    spouting_profile, 
    roof_colour, 
    roof_profile, 
    downpipe_size, 
    downpipe_colour, 
    notes,  
    status, 
    tile_color
  )
  VALUES
    -- Job 6: Awaiting order, unscheduled
    (
      '42 Park Avenue, Tauranga', 
      'Michael Brown', 
      'Q-2025-006', 
      'Grey', 
      'Grey', 
      'Box', 
      'Colorsteel', 
      'Tray', 
      '65mm', 
      'Grey', 
      'Quote accepted, awaiting material order.', 
      'Awaiting Order', 
      '#0ea5e9'
    ),
    -- Job 7: Just quoted
    (
      '156 Victoria Street, Wellington', 
      'Jennifer Lee', 
      'Q-2025-007', 
      'White', 
      'White', 
      'Half Round', 
      'Colorsteel', 
      'Corrugate', 
      '80mm', 
      'White', 
      'New quote, customer reviewing options.', 
      'Awaiting Order', 
      '#a855f7'
    ),
    -- Job 8: Urgent job
    (
      '23 Harbor View, Auckland', 
      'Thomas Wilson', 
      'Q-2025-008', 
      'Black', 
      'Black', 
      'Box', 
      'Colorsteel', 
      'Tray', 
      '65mm', 
      'Black', 
      'Urgent job - customer experiencing leaks during rain.', 
      'Awaiting Order', 
      '#f43f5e'
    );

  -- Add secondary workers to some jobs
  IF admin1_id IS NOT NULL AND viewer1_id IS NOT NULL THEN
    INSERT INTO job_secondary_workers (job_id, worker_id)
    SELECT id, viewer1_id FROM jobs WHERE customer_name = 'James Wilson'
    ON CONFLICT DO NOTHING;
  END IF;
  
  IF admin2_id IS NOT NULL AND viewer2_id IS NOT NULL THEN
    INSERT INTO job_secondary_workers (job_id, worker_id)
    SELECT id, viewer2_id FROM jobs WHERE customer_name = 'Sarah Thompson'
    ON CONFLICT DO NOTHING;
  END IF;
  
  IF admin1_id IS NOT NULL AND admin2_id IS NOT NULL THEN
    INSERT INTO job_secondary_workers (job_id, worker_id)
    SELECT id, admin2_id FROM jobs WHERE customer_name = 'Emma Williams'
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Validate that data was added
DO $$
DECLARE
  worker_count INTEGER;
  job_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO worker_count FROM workers;
  SELECT COUNT(*) INTO job_count FROM jobs;
  
  RAISE NOTICE 'Data validation: % workers, % jobs added', worker_count, job_count;
  
  IF worker_count < 3 OR job_count < 5 THEN
    RAISE WARNING 'Not all sample data was inserted successfully';
  END IF;
END $$;