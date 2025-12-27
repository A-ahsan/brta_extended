-- Enable Realtime for Community Reports
-- Run this in your Supabase SQL Editor to enable real-time updates

-- Enable realtime for community_reports table
ALTER PUBLICATION supabase_realtime ADD TABLE community_reports;

-- Enable realtime for report_attachments table (optional, for image updates)
ALTER PUBLICATION supabase_realtime ADD TABLE report_attachments;

-- Verify realtime is enabled
-- You can check with this query:
-- SELECT schemaname, tablename 
-- FROM pg_publication_tables 
-- WHERE pubname = 'supabase_realtime';

-- Expected result should include:
-- public | community_reports
-- public | report_attachments
