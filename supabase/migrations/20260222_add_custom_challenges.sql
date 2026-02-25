-- Update challenges type check to strictly include only supported types
ALTER TABLE public.challenges DROP CONSTRAINT IF EXISTS challenges_type_check;
ALTER TABLE public.challenges ADD CONSTRAINT challenges_type_check CHECK (type IN ('steps', 'calories', 'water', 'sleep', 'custom'));

-- Add daily_logs column to user_challenges to track daily completions
ALTER TABLE public.user_challenges ADD COLUMN IF NOT EXISTS daily_logs JSONB DEFAULT '[]'::jsonb;

