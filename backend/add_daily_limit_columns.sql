-- Add new columns to user_information table for daily analogy generation limits
-- Run this script in your Supabase SQL editor

-- Add daily_analogies_generated column (integer, default 0)
ALTER TABLE user_information 
ADD COLUMN IF NOT EXISTS daily_analogies_generated INTEGER DEFAULT 0;

-- Add daily_reset_date column (date)
ALTER TABLE user_information 
ADD COLUMN IF NOT EXISTS daily_reset_date DATE;

-- Add lifetime_analogies_generated column if it doesn't exist (integer, default 0)
ALTER TABLE user_information 
ADD COLUMN IF NOT EXISTS lifetime_analogies_generated INTEGER DEFAULT 0;

-- Update existing users to have the new columns with default values
UPDATE user_information 
SET 
    daily_analogies_generated = 0,
    lifetime_analogies_generated = 0
WHERE daily_analogies_generated IS NULL OR lifetime_analogies_generated IS NULL;

-- Create an index on daily_reset_date for better performance
CREATE INDEX IF NOT EXISTS idx_user_information_daily_reset_date 
ON user_information(daily_reset_date);

-- Note: last_analogy_time column already exists in your database, so no need to add it 