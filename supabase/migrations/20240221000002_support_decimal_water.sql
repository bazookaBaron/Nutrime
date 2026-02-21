-- Migration: support decimal water intake
-- Description: Changes water_glasses column to NUMERIC to support litre values (e.g. 0.25, 0.5)

ALTER TABLE public.daily_stats
ALTER COLUMN water_glasses TYPE NUMERIC;

-- Optional: Add a comment to explain the change
COMMENT ON COLUMN public.daily_stats.water_glasses IS 'Daily water intake in Litres (L). Previously was counted in glasses.';
