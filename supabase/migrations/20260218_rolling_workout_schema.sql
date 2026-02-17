-- 20260218_rolling_workout_schema.sql

-- 1. Table: workout_daily_plans
-- Stores the active/future workout days. 
-- Replacing the monolithic 'workout_plans' table concept.

CREATE TABLE IF NOT EXISTS public.workout_daily_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    day_number INTEGER NOT NULL, -- The 1-based day index in the user's journey
    plan_data JSONB NOT NULL, -- detailed exercise list, focus, etc.
    is_completed BOOLEAN DEFAULT FALSE,
    calories_burned INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Ensure one plan per day per user
    UNIQUE(user_id, date)
);

-- RLS for workout_daily_plans
ALTER TABLE public.workout_daily_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD their own daily plans"
    ON public.workout_daily_plans
    FOR ALL
    USING (auth.uid() = user_id);

-- 2. Table: workout_history
-- Archives past days for analytics.

CREATE TABLE IF NOT EXISTS public.workout_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    summary_data JSONB, -- simplified stats: e.g. { "total_calories": 500, "focus": "Upper" }
    original_plan_snapshot JSONB, -- verification data
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS for workout_history
ALTER TABLE public.workout_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own history"
    ON public.workout_history
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users typically don't delete history, but we allow it if they delete their account (via cascade)
-- or if specific cleanup logic runs.

-- 3. Table: workout_job_queue
-- Queue for background generation jobs.

CREATE TABLE IF NOT EXISTS public.workout_job_queue (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    status TEXT CHECK (status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending' NOT NULL,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for fetching pending jobs quickly
CREATE INDEX idx_workout_job_queue_status ON public.workout_job_queue(status);

-- Ensure a user only has one PENDING job at a time to prevent duplicate triggers
CREATE UNIQUE INDEX idx_unique_pending_job_per_user 
    ON public.workout_job_queue(user_id) 
    WHERE status = 'pending';

-- RLS for workout_job_queue
-- Users need to INSERT jobs. Service role processes them.
ALTER TABLE public.workout_job_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own jobs"
    ON public.workout_job_queue
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own jobs"
    ON public.workout_job_queue
    FOR SELECT
    USING (auth.uid() = user_id);

-- Function to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_workout_job_queue_modtime
    BEFORE UPDATE ON public.workout_job_queue
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
