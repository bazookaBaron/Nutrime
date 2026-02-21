-- Migration: Add increment_xp RPC function
-- Description: Safely increments a user's workout_xp and updates their workout_level.

CREATE OR REPLACE FUNCTION public.increment_xp(amount int)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_xp int;
    new_level int;
BEGIN
    -- Increment the XP
    UPDATE public.profiles
    SET workout_xp = COALESCE(workout_xp, 0) + amount
    WHERE id = auth.uid()
    RETURNING workout_xp INTO new_xp;

    -- Calculate the new level based on centralized logic
    -- Tiered levels: 0-1999 (L1), 2000-3499 (L2), 3500-4999 (L3), 5000-5000 (L4), 5001+ (L5)
    IF new_xp >= 5001 THEN 
        new_level := 5;
    ELSIF new_xp >= 5000 THEN 
        new_level := 4;
    ELSIF new_xp >= 3500 THEN 
        new_level := 3;
    ELSIF new_xp >= 2000 THEN 
        new_level := 2;
    ELSE 
        new_level := 1;
    END IF;

    -- Update the level
    UPDATE public.profiles
    SET workout_level = new_level
    WHERE id = auth.uid();
END;
$$;

-- Grant permissions for API access
GRANT EXECUTE ON FUNCTION public.increment_xp(int) TO anon, authenticated, service_role;
