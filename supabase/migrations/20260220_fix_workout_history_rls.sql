-- 20260220_fix_workout_history_rls.sql

-- Allow users to insert their own workout history
CREATE POLICY "Users can insert their own history"
    ON public.workout_history
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Optional: Allow users to update their own history if needed (e.g. refining summary)
CREATE POLICY "Users can update their own history"
    ON public.workout_history
    FOR UPDATE
    USING (auth.uid() = user_id);
