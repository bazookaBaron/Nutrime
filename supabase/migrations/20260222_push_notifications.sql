-- Add push notification fields to profiles table
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS push_token TEXT,
    ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC',
    ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT true;

-- Add daily notification tracking columns
ALTER TABLE public.daily_stats
    ADD COLUMN IF NOT EXISTS water_intake_ml INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS calories_logged_morning BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS calories_logged_evening BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS calories_logged_night BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS workout_completed_today BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS daily_goal_completed BOOLEAN DEFAULT false;

-- Index for fast lookup of users with push tokens
CREATE INDEX IF NOT EXISTS idx_profiles_push_token
    ON public.profiles(push_token)
    WHERE push_token IS NOT NULL AND notifications_enabled = true;

-- Index on daily_stats date for efficient TODAY queries
CREATE INDEX IF NOT EXISTS idx_daily_stats_date
    ON public.daily_stats(date, user_id);
