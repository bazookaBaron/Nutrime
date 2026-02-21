ALTER TABLE public.challenges DROP CONSTRAINT IF EXISTS challenges_type_check;
ALTER TABLE public.challenges ADD CONSTRAINT challenges_type_check CHECK (type IN ('steps', 'calories', 'manual', 'streak', 'water', 'sleep'));
