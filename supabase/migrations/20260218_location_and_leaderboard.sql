-- Migration: Add Location and Leaderboard Support
-- Date: 2026-02-18

-- Add location fields to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS country VARCHAR(100),
ADD COLUMN IF NOT EXISTS state VARCHAR(100);

-- Create indexes for leaderboard queries
CREATE INDEX IF NOT EXISTS idx_profiles_workout_xp ON profiles(workout_xp DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_country_xp ON profiles(country, workout_xp DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_state_xp ON profiles(state, workout_xp DESC);

-- Add username field if it doesn't exist (for leaderboard display)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS username VARCHAR(100);

-- Add daily exercise completions tracking to daily_stats (if table exists)
-- This allows us to track which specific exercises were completed
ALTER TABLE daily_stats
ADD COLUMN IF NOT EXISTS daily_exercise_completions JSONB DEFAULT '[]'::jsonb;

-- Update RLS policies to allow reading leaderboard data
-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can view leaderboard data" ON profiles;

-- Create new policy allowing users to read specific fields for leaderboard
CREATE POLICY "Users can view leaderboard data"
ON profiles FOR SELECT
USING (
  auth.uid() IS NOT NULL
);

-- Note: The policy allows authenticated users to read all profile fields
-- In production, you might want to create a view that exposes only necessary fields
-- For now, we'll handle field filtering in the application layer

-- Create a leaderboard view for better performance (optional but recommended)
CREATE OR REPLACE VIEW leaderboard_view AS
SELECT 
  id,
  full_name,
  username,
  workout_xp,
  workout_level,
  country,
  state
FROM profiles
WHERE workout_xp > 0
ORDER BY workout_xp DESC;

-- Grant access to the view
GRANT SELECT ON leaderboard_view TO authenticated;

-- Add comment
COMMENT ON COLUMN profiles.country IS 'User country for location-based leaderboards';
COMMENT ON COLUMN profiles.state IS 'User state/province for location-based leaderboards';
COMMENT ON COLUMN profiles.username IS 'Public username for leaderboard display';
