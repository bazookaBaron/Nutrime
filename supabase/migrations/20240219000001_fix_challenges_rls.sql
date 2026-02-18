-- Add creator_id to challenges table
ALTER TABLE public.challenges 
ADD COLUMN IF NOT EXISTS creator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Fix RLS: Allow authenticated users to create challenges
CREATE POLICY "Authenticated users can create challenges" ON public.challenges
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

-- Update status check just in case it was missed
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'challenges_status_check') THEN
        ALTER TABLE public.challenges ADD CONSTRAINT challenges_status_check CHECK (status IN ('active', 'expired'));
    END IF;
END $$;
