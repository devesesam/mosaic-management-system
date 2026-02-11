/*
  # Update job scheduling to support hour-based timing

  1. Changes
    - Modify start_date and end_date columns to use timestamptz instead of date
    - This allows for precise hour-based scheduling
    
  2. Data Migration
    - Convert existing dates to timestamps, setting default time to 9:00 AM
*/

DO $$ 
BEGIN
  -- Temporarily store existing dates
  ALTER TABLE jobs 
  ADD COLUMN temp_start timestamptz,
  ADD COLUMN temp_end timestamptz;

  -- Convert existing dates to timestamps at 9 AM
  UPDATE jobs 
  SET 
    temp_start = start_date::timestamptz + INTERVAL '9 hours',
    temp_end = end_date::timestamptz + INTERVAL '17 hours'
  WHERE start_date IS NOT NULL OR end_date IS NOT NULL;

  -- Drop old columns
  ALTER TABLE jobs 
  DROP COLUMN start_date,
  DROP COLUMN end_date;

  -- Add new timestamp columns
  ALTER TABLE jobs 
  ADD COLUMN start_date timestamptz,
  ADD COLUMN end_date timestamptz;

  -- Restore data
  UPDATE jobs 
  SET 
    start_date = temp_start,
    end_date = temp_end;

  -- Clean up temporary columns
  ALTER TABLE jobs 
  DROP COLUMN temp_start,
  DROP COLUMN temp_end;
END $$;