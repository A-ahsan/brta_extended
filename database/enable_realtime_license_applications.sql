-- Enable Realtime for license_applications table
-- Run this in your Supabase SQL Editor to make the progress tracker update live

-- Enable realtime on the license_applications table
ALTER PUBLICATION supabase_realtime ADD TABLE license_applications;

-- Also enable for physical_exam_bookings (for exam booking updates)
ALTER PUBLICATION supabase_realtime ADD TABLE physical_exam_bookings;

-- Verify they're enabled
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename IN ('license_applications', 'physical_exam_bookings');

-- Expected output: Should show both tables in 'public' schema
