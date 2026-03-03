-- Add `is_visible` column to `tasks` table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_visible boolean DEFAULT true;
