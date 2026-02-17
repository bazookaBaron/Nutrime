-- Migration to fix "Database error deleting user"
-- This ensures that when a user is deleted from auth.users, all their related data is also deleted automatically.

-- 1. Fix Profiles table reference to auth.users
ALTER TABLE IF EXISTS public.profiles
DROP CONSTRAINT IF EXISTS profiles_id_fkey;

ALTER TABLE IF EXISTS public.profiles
ADD CONSTRAINT profiles_id_fkey
    FOREIGN KEY (id)
    REFERENCES auth.users(id)
    ON DELETE CASCADE;

-- 2. Fix Workout Plans table reference to profiles
-- (This ensures if a profile is deleted, the workout plan goes too)
ALTER TABLE IF EXISTS public.workout_plans
DROP CONSTRAINT IF EXISTS workout_plans_user_id_fkey;

ALTER TABLE IF EXISTS public.workout_plans
ADD CONSTRAINT workout_plans_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES public.profiles(id)
    ON DELETE CASCADE;

-- 3. Fix Food Logs table reference to auth.users
ALTER TABLE IF EXISTS public.food_logs
DROP CONSTRAINT IF EXISTS food_logs_user_id_fkey;

ALTER TABLE IF EXISTS public.food_logs
ADD CONSTRAINT food_logs_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES auth.users(id)
    ON DELETE CASCADE;

-- 4. Fix Daily Stats table reference to auth.users
ALTER TABLE IF EXISTS public.daily_stats
DROP CONSTRAINT IF EXISTS daily_stats_user_id_fkey;

ALTER TABLE IF EXISTS public.daily_stats
ADD CONSTRAINT daily_stats_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES auth.users(id)
    ON DELETE CASCADE;

-- NOTE: If your table names or constraint names are different, 
-- you might need to adjust them in the Supabase SQL Editor.
-- These are the standard names based on the project code.
