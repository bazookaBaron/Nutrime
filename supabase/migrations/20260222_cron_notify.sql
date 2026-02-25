-- Enable required extensions (idempotent)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove existing job if it exists, then re-create (idempotent)
SELECT cron.unschedule('hourly-push-notifications')
WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'hourly-push-notifications'
);

SELECT cron.schedule(
    'hourly-push-notifications',
    '0 * * * *',
    $$
    SELECT net.http_post(
        url := (SELECT CONCAT(
            current_setting('app.supabase_url', true),
            '/functions/v1/notify-users'
        )),
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', CONCAT('Bearer ', current_setting('app.service_role_key', true))
        ),
        body := '{}'::jsonb,
        timeout_milliseconds := 55000
    );
    $$
);
