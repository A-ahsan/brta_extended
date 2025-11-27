-- Row Level Security (RLS) Policies for Physical Exam System
-- Run this AFTER creating the tables

-- Enable RLS on tables
ALTER TABLE test_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE physical_exam_bookings ENABLE ROW LEVEL SECURITY;

-- ====================================
-- TEST CENTERS POLICIES
-- ====================================

-- Public can view active test centers
CREATE POLICY "Anyone can view active test centers"
ON test_centers FOR SELECT
USING (is_active = true);

-- Only admins can insert test centers
CREATE POLICY "Admins can insert test centers"
ON test_centers FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Only admins can update test centers
CREATE POLICY "Admins can update test centers"
ON test_centers FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Only admins can delete test centers (soft delete via is_active)
CREATE POLICY "Admins can delete test centers"
ON test_centers FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- ====================================
-- PHYSICAL EXAM BOOKINGS POLICIES
-- ====================================

-- Users can view their own bookings
CREATE POLICY "Users can view own bookings"
ON physical_exam_bookings FOR SELECT
USING (
  user_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'police')
  )
);

-- Users can insert their own bookings
CREATE POLICY "Users can create own bookings"
ON physical_exam_bookings FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND
  -- Ensure user owns the application
  EXISTS (
    SELECT 1 FROM license_applications
    WHERE license_applications.id = application_id
    AND license_applications.user_id = auth.uid()
  )
);

-- Users can update their own bookings (reschedule/cancel)
-- But only if status is 'scheduled'
CREATE POLICY "Users can update own scheduled bookings"
ON physical_exam_bookings FOR UPDATE
USING (
  user_id = auth.uid()
  AND status = 'scheduled'
)
WITH CHECK (
  user_id = auth.uid()
  AND status IN ('scheduled', 'cancelled', 'rescheduled')
);

-- Admins can update any booking (for evaluation)
CREATE POLICY "Admins can evaluate bookings"
ON physical_exam_bookings FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Users can delete their own bookings (cancel)
CREATE POLICY "Users can cancel own bookings"
ON physical_exam_bookings FOR DELETE
USING (
  user_id = auth.uid()
  AND status = 'scheduled'
);

-- ====================================
-- HELPER FUNCTIONS FOR POLICIES
-- ====================================

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is police
CREATE OR REPLACE FUNCTION is_police()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'police'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user owns application
CREATE OR REPLACE FUNCTION owns_application(app_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM license_applications
    WHERE id = app_id
    AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================
-- GRANT PERMISSIONS
-- ====================================

-- Grant execute on helper functions
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION is_police() TO authenticated;
GRANT EXECUTE ON FUNCTION owns_application(UUID) TO authenticated;

-- Grant access to views
GRANT SELECT ON test_centers_with_rush TO authenticated;

-- ====================================
-- COMMENTS
-- ====================================

COMMENT ON POLICY "Anyone can view active test centers" ON test_centers IS 
'Public read access to active test centers for booking';

COMMENT ON POLICY "Admins can insert test centers" ON test_centers IS 
'Only admin users can create new test centers';

COMMENT ON POLICY "Users can view own bookings" ON physical_exam_bookings IS 
'Users can see their bookings, admins/police can see all';

COMMENT ON POLICY "Users can create own bookings" ON physical_exam_bookings IS 
'Users can book exams for their own applications only';

COMMENT ON POLICY "Admins can evaluate bookings" ON physical_exam_bookings IS 
'Admins can mark exams as passed/failed';

-- ====================================
-- ADDITIONAL SECURITY
-- ====================================

-- Prevent booking more than one active exam per application
ALTER TABLE physical_exam_bookings
DROP CONSTRAINT IF EXISTS physical_exam_bookings_application_id_status_key;

-- Add unique constraint for active bookings
CREATE UNIQUE INDEX unique_active_booking_per_application
ON physical_exam_bookings (application_id)
WHERE status = 'scheduled';

-- Add check constraint for exam date (must be future)
ALTER TABLE physical_exam_bookings
ADD CONSTRAINT exam_date_must_be_future
CHECK (exam_date >= CURRENT_DATE);

-- exam_time constraint removed - all exams are at 9:00 AM

COMMENT ON CONSTRAINT exam_date_must_be_future ON physical_exam_bookings IS
'Exam date must be today or in the future';

COMMENT ON CONSTRAINT valid_exam_time ON physical_exam_bookings IS
'Exam time must be between 9:00 AM and 4:30 PM';
