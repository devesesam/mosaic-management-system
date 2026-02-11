/*
  # Add sample workers and jobs

  1. New Data
    - 4 workers with contact details
    - 4 jobs with varying statuses and schedules
      - 2 scheduled jobs (current week)
      - 2 unscheduled jobs
      
  2. Job Details
    - Various colors, statuses, and specifications
    - Realistic addresses and customer information
    - Mix of scheduled and unscheduled work
*/

-- Insert Workers
INSERT INTO workers (name, email, phone)
VALUES
  ('John Smith', 'john.smith@example.com', '021-555-0101'),
  ('Sarah Wilson', 'sarah.wilson@example.com', '021-555-0102'),
  ('Mike Johnson', 'mike.johnson@example.com', '021-555-0103'),
  ('David Brown', 'david.brown@example.com', '021-555-0104');

-- Insert Jobs
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
  -- Job 1: Scheduled, In Progress
  (
    '123 Beach Road, Mount Maunganui',
    'James Wilson',
    'Q-2025-001',
    'Grey',
    'Grey',
    'Quarter Round',
    'Slate Grey',
    'Corrugated',
    '80mm',
    'Grey',
    'Customer prefers morning installation',
    (SELECT id FROM workers WHERE name = 'John Smith'),
    CURRENT_DATE,
    CURRENT_DATE + 2,
    'In Progress',
    '#3b82f6'
  ),
  -- Job 2: Scheduled, Awaiting Order
  (
    '45 Valley Road, Tauranga',
    'Emma Thompson',
    'Q-2025-002',
    'White',
    'White',
    'Box',
    'Terracotta',
    'Metal Tile',
    '65mm',
    'White',
    'Access from rear of property',
    (SELECT id FROM workers WHERE name = 'Sarah Wilson'),
    CURRENT_DATE + 5,
    CURRENT_DATE + 6,
    'Awaiting Order',
    '#f97316'
  ),
  -- Job 3: Unscheduled, Ordered
  (
    '789 Hill Street, Papamoa',
    'Michael Chen',
    'Q-2025-003',
    'Black',
    'Black',
    'Half Round',
    'Charcoal',
    'Stone Coated',
    '80mm',
    'Black',
    'Heritage property, requires careful handling',
    NULL,
    NULL,
    NULL,
    'Ordered',
    '#22c55e'
  ),
  -- Job 4: Unscheduled, Awaiting Order
  (
    '234 Ocean View Drive, Mount Maunganui',
    'Sarah Miller',
    'Q-2025-004',
    'Bronze',
    'Bronze',
    'Box',
    'Sandy Beige',
    'Metal Tile',
    '65mm',
    'Bronze',
    'Coastal property, corrosion-resistant materials required',
    NULL,
    NULL,
    NULL,
    'Awaiting Order',
    '#8b5cf6'
  );