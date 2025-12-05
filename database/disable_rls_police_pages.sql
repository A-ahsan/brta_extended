-- Disable RLS for Police Dashboard Pages
-- This allows police officers to access all vehicle records, licenses, and inspections

-- Disable RLS on registered_vehicles table
ALTER TABLE registered_vehicles DISABLE ROW LEVEL SECURITY;

-- Disable RLS on licenses table
ALTER TABLE licenses DISABLE ROW LEVEL SECURITY;

-- Disable RLS on police_inspections table
ALTER TABLE police_inspections DISABLE ROW LEVEL SECURITY;

-- Disable RLS on traffic_violations table
ALTER TABLE traffic_violations DISABLE ROW LEVEL SECURITY;

-- Disable RLS on profiles table
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('registered_vehicles', 'licenses', 'police_inspections', 'traffic_violations', 'profiles');
