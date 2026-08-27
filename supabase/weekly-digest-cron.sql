-- Weekly digest cron job.
--
-- Deploy steps (run once, from your machine, not from this SQL file):
--   1. supabase functions deploy weekly-digest --project-ref mdbldsntyjtfrqabavlz
--   2. Set secrets (Supabase dashboard -> Project Settings -> Edge Functions -> Secrets,
--      or `supabase secrets set`):
--        GMAIL_USER              (same Gmail account already used for send-invoice)
--        GMAIL_APP_PASSWORD      (same app password already used for send-invoice)
--        GMAIL_FROM              (optional, defaults to GMAIL_USER)
--        SUPABASE_URL            (already set automatically for every edge function)
--        SUPABASE_SERVICE_ROLE_KEY  (already set automatically for every edge function)
--        APP_URL                 (optional, defaults to https://tk.bergman.rocks --
--                                 set this once you know the real deployed URL)
--   3. Enable the pg_cron and pg_net extensions:
--        Database -> Extensions -> enable "pg_cron" and "pg_net"
--   4. Run the SQL below in the SQL Editor, replacing SERVICE_ROLE_KEY with the
--      actual value from Project Settings -> API -> service_role secret.
--      (This key grants full database access -- do not commit it, do not put it
--      in a client-side .env file. It only belongs in this one SQL statement,
--      run once, stored inside Supabase's own cron job config.)

select cron.schedule(
  'tk-weekly-digest',
  '0 9 * * 1', -- every Monday at 9:00 UTC
  $$
  select net.http_post(
    url := 'https://mdbldsntyjtfrqabavlz.supabase.co/functions/v1/weekly-digest',
    headers := jsonb_build_object(
      'Authorization', 'Bearer SERVICE_ROLE_KEY',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- To check it's scheduled:
--   select * from cron.job where jobname = 'tk-weekly-digest';
--
-- To unschedule:
--   select cron.unschedule('tk-weekly-digest');
--
-- To test the function manually without waiting for Monday, run this once
-- (also needs SERVICE_ROLE_KEY swapped in), or just call it from a terminal:
--   curl -X POST https://mdbldsntyjtfrqabavlz.supabase.co/functions/v1/weekly-digest \
--     -H "Authorization: Bearer SERVICE_ROLE_KEY" -H "Content-Type: application/json"
