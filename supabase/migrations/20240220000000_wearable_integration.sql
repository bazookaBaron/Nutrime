-- Create table for storing wearable data
CREATE TABLE IF NOT EXISTS public.wearable_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    tracker_type TEXT NOT NULL, -- 'apple_health', 'google_health_connect'
    date DATE NOT NULL,
    steps INTEGER DEFAULT 0,
    heart_rate_avg FLOAT DEFAULT 0,
    calories_active FLOAT DEFAULT 0,
    sleep_minutes INTEGER DEFAULT 0,
    distance_km FLOAT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

    -- Ensure one record per user per date per tracker (or just per date if we merge sources)
    -- We'll assume we want to track source, but mostly one summary per day.
    -- Let's make it unique per user+date to keep it simple as a "daily summary"
    CONSTRAINT unique_daily_wearable_summary UNIQUE (user_id, date)
);

-- Enable RLS
ALTER TABLE public.wearable_data ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own wearable data"
    ON public.wearable_data FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert/update their own wearable data"
    ON public.wearable_data FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own wearable data"
    ON public.wearable_data FOR UPDATE
    USING (auth.uid() = user_id);

-- Function to clean up data older than 30 days
-- This can be called via RPC from the client during sync, or scheduled via pg_cron if enabled.
CREATE OR REPLACE FUNCTION delete_old_wearable_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.wearable_data
    WHERE date < (CURRENT_DATE - INTERVAL '30 days');
END;
$$;
