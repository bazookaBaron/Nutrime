
-- SQL Schema for Workout Integration

-- 1. Update Profiles table with XP and Level fields
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS workout_xp INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS workout_level INTEGER DEFAULT 1;

-- 2. Create Workout Plans table
CREATE TABLE IF NOT EXISTS workout_plans (
    user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    schedule JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Enable RLS (Row Level Security)
ALTER TABLE workout_plans ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies for workout_plans
CREATE POLICY "Users can view their own workout plans" 
ON workout_plans FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own workout plans" 
ON workout_plans FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own workout plans" 
ON workout_plans FOR UPDATE 
USING (auth.uid() = user_id);
