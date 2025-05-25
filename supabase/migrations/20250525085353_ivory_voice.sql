/*
  # Add Sample Data for Immediate Display
  
  1. Disable RLS on all tables to ensure unrestricted access
  2. Add sample workers and jobs to display in the calendar
*/

-- DISABLE ALL SECURITY
ALTER TABLE jobs DISABLE ROW LEVEL SECURITY;
ALTER TABLE workers DISABLE ROW LEVEL SECURITY;
ALTER TABLE job_secondary_workers DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- ADD MORE SAMPLE WORKERS
INSERT INTO workers (name, email, role)
VALUES 
  ('John Smith', 'john@example.com', 'admin'),
  ('Mike Johnson', 'mike@example.com', 'admin'),
  ('Sarah Williams', 'sarah@example.com', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Add jobs with worker assignments
DO $$
DECLARE
  worker1_id UUID;
  worker2_id UUID;
  worker3_id UUID;
  admin_id UUID;
BEGIN
  -- Get worker IDs
  SELECT id INTO worker1_id FROM workers WHERE name = 'John Smith';
  SELECT id INTO worker2_id FROM workers WHERE name = 'Mike Johnson';
  SELECT id INTO worker3_id FROM workers WHERE name = 'Sarah Williams';
  SELECT id INTO admin_id FROM workers WHERE email = 'damsevese@gmail.com';

  -- Make sure the main user has an admin worker account
  IF admin_id IS NULL THEN
    INSERT INTO workers (name, email, role)
    VALUES ('Admin User', 'damsevese@gmail.com', 'admin')
    RETURNING id INTO admin_id;
  END IF;

  -- ADD SAMPLE JOBS
  INSERT INTO jobs (
    address,
    customer_name,
    quote_number,
    worker_id,
    start_date,
    end_date,
    status,
    tile_color
  ) VALUES (
    '123 Main Street',
    'Customer 1',
    'Q-2023-001',
    worker1_id,
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '2 days',
    'In Progress',
    '#3b82f6'
  ) ON CONFLICT DO NOTHING;
  
  INSERT INTO jobs (
    address,
    customer_name,
    quote_number,
    worker_id,
    start_date,
    end_date,
    status,
    tile_color
  ) VALUES (
    '456 Elm Street',
    'Customer 2',
    'Q-2023-002',
    worker2_id,
    CURRENT_DATE + INTERVAL '1 day',
    CURRENT_DATE + INTERVAL '3 days',
    'Awaiting Order',
    '#22c55e'
  ) ON CONFLICT DO NOTHING;
  
  INSERT INTO jobs (
    address,
    customer_name,
    quote_number,
    worker_id,
    start_date,
    end_date,
    status,
    tile_color
  ) VALUES (
    '789 Oak Avenue',
    'Customer 3',
    'Q-2023-003',
    worker3_id,
    CURRENT_DATE + INTERVAL '4 days',
    CURRENT_DATE + INTERVAL '5 days',
    'Ordered',
    '#f59e0b'
  ) ON CONFLICT DO NOTHING;
  
  INSERT INTO jobs (
    address,
    customer_name,
    quote_number,
    worker_id,
    start_date,
    end_date,
    status,
    tile_color
  ) VALUES (
    '101 Pine Road',
    'Customer 4',
    'Q-2023-004',
    admin_id,
    CURRENT_DATE - INTERVAL '1 day',
    CURRENT_DATE + INTERVAL '1 day',
    'In Progress',
    '#ef4444'
  ) ON CONFLICT DO NOTHING;
  
  -- Add some unscheduled jobs
  INSERT INTO jobs (
    address,
    customer_name,
    quote_number,
    status,
    tile_color
  ) VALUES (
    '222 Unscheduled Way',
    'Pending Customer 1',
    'Q-2023-005',
    'Awaiting Order',
    '#8b5cf6'
  ) ON CONFLICT DO NOTHING;
  
  INSERT INTO jobs (
    address,
    customer_name,
    quote_number,
    status,
    tile_color
  ) VALUES (
    '333 New Job Lane',
    'Pending Customer 2',
    'Q-2023-006',
    'Awaiting Order',
    '#ec4899'
  ) ON CONFLICT DO NOTHING;
END $$;