-- Enable Realtime for Licenses Table

-- Drop existing publication if it exists
DROP PUBLICATION IF EXISTS supabase_realtime_licenses;

-- Create publication for licenses table
CREATE PUBLICATION supabase_realtime_licenses FOR TABLE licenses;

-- Ensure realtime is enabled for the licenses table
ALTER PUBLICATION supabase_realtime ADD TABLE licenses;

-- Note: You may need to enable this in Supabase Dashboard:
-- Database -> Replication -> supabase_realtime -> enable 'licenses' table
