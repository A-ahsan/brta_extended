-- Enable Realtime for notifications table
-- Run this in your Supabase SQL Editor

-- Enable realtime on the notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Verify it's enabled
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename = 'notifications';

-- Expected output: Should show 'public' schema and 'notifications' table
