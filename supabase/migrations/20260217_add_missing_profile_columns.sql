-- Add missing columns to profiles table
DO $$
BEGIN
    -- Goal (from Step 1)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'goal') THEN
        ALTER TABLE profiles ADD COLUMN goal TEXT;
    END IF;

    -- Stats (from Step 2)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'weight') THEN
        ALTER TABLE profiles ADD COLUMN weight NUMERIC;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'height') THEN
        ALTER TABLE profiles ADD COLUMN height NUMERIC;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'age') THEN
        ALTER TABLE profiles ADD COLUMN age INTEGER;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'gender') THEN
        ALTER TABLE profiles ADD COLUMN gender TEXT;
    END IF;

    -- Activity (from Step 3)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'activity_level') THEN
        ALTER TABLE profiles ADD COLUMN activity_level TEXT;
    END IF;

    -- Targets (from Step 3b)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'target_weight') THEN
        ALTER TABLE profiles ADD COLUMN target_weight NUMERIC;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'target_duration_weeks') THEN
        ALTER TABLE profiles ADD COLUMN target_duration_weeks INTEGER;
    END IF;

    -- Results (from Step 4)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'daily_calories') THEN
        ALTER TABLE profiles ADD COLUMN daily_calories INTEGER;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'meal_split') THEN
        ALTER TABLE profiles ADD COLUMN meal_split JSONB;
    END IF;
END $$;
