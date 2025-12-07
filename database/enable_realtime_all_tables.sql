-- Enable Realtime for all important tables
-- Run this in Supabase SQL Editor

-- First, check current realtime tables
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;

-- Enable realtime for route permits (with error handling)
DO $$ 
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE route_permits;
    RAISE NOTICE 'Added route_permits to realtime';
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'route_permits already in realtime';
END $$;

-- Enable realtime for license applications
DO $$ 
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE license_applications;
    RAISE NOTICE 'Added license_applications to realtime';
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'license_applications already in realtime';
END $$;

-- Enable realtime for licenses
DO $$ 
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE licenses;
    RAISE NOTICE 'Added licenses to realtime';
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'licenses already in realtime';
END $$;

-- Enable realtime for registered vehicles
DO $$ 
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE registered_vehicles;
    RAISE NOTICE 'Added registered_vehicles to realtime';
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'registered_vehicles already in realtime';
END $$;

-- Enable realtime for traffic violations
DO $$ 
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE traffic_violations;
    RAISE NOTICE 'Added traffic_violations to realtime';
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'traffic_violations already in realtime';
END $$;

-- Enable realtime for payments
DO $$ 
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE payments;
    RAISE NOTICE 'Added payments to realtime';
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'payments already in realtime';
END $$;

-- Enable realtime for physical exam bookings
DO $$ 
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE physical_exam_bookings;
    RAISE NOTICE 'Added physical_exam_bookings to realtime';
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'physical_exam_bookings already in realtime';
END $$;

-- Enable realtime for notifications
DO $$ 
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
    RAISE NOTICE 'Added notifications to realtime';
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'notifications already in realtime';
END $$;

-- Verify all tables now have realtime enabled
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;
