-- Physical Exam Test Centers Schema
-- Stores test centers with location data

CREATE TABLE IF NOT EXISTS test_centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  center_name_en VARCHAR(255) NOT NULL,
  center_name_bn VARCHAR(255) NOT NULL,
  office_name_en VARCHAR(255) NOT NULL,
  office_name_bn VARCHAR(255) NOT NULL,
  
  -- Location Data
  address_en TEXT NOT NULL,
  address_bn TEXT NOT NULL,
  division VARCHAR(100) NOT NULL,
  district VARCHAR(100) NOT NULL,
  upazila VARCHAR(100),
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  
  -- Contact Information
  phone VARCHAR(20),
  email VARCHAR(100),
  
  -- Capacity
  daily_capacity INTEGER DEFAULT 50,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Physical Exam Bookings Schema
-- Stores user test slot bookings

CREATE TABLE IF NOT EXISTS physical_exam_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Application Reference
  application_id UUID REFERENCES license_applications(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Test Center & Schedule
  test_center_id UUID REFERENCES test_centers(id) ON DELETE RESTRICT NOT NULL,
  exam_date DATE NOT NULL,
  -- exam_time removed - all exams are at 9:00 AM
  
  -- Status
  status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'rescheduled')) NOT NULL,
  
  -- Result (filled by admin after exam)
  result VARCHAR(20) CHECK (result IN ('passed', 'failed', NULL)),
  admin_remarks TEXT,
  evaluated_by UUID REFERENCES auth.users(id),
  evaluated_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraint: One booking per application at a time
  UNIQUE(application_id, status)
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_test_centers_active ON test_centers(is_active);
CREATE INDEX IF NOT EXISTS idx_test_centers_division ON test_centers(division);
CREATE INDEX IF NOT EXISTS idx_test_centers_district ON test_centers(district);
CREATE INDEX IF NOT EXISTS idx_test_centers_location ON test_centers(latitude, longitude);

CREATE INDEX IF NOT EXISTS idx_bookings_user ON physical_exam_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_application ON physical_exam_bookings(application_id);
CREATE INDEX IF NOT EXISTS idx_bookings_center ON physical_exam_bookings(test_center_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON physical_exam_bookings(exam_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON physical_exam_bookings(status);

-- Function: Get rush level for a test center on a specific date
CREATE OR REPLACE FUNCTION get_center_rush_level(
  p_center_id UUID,
  p_date DATE
)
RETURNS TEXT AS $$
DECLARE
  booking_count INTEGER;
  daily_capacity INTEGER;
  rush_percentage DECIMAL;
BEGIN
  -- Get center capacity
  SELECT test_centers.daily_capacity INTO daily_capacity
  FROM test_centers
  WHERE id = p_center_id;
  
  -- Get booking count for the date
  SELECT COUNT(*) INTO booking_count
  FROM physical_exam_bookings
  WHERE test_center_id = p_center_id
    AND exam_date = p_date
    AND status = 'scheduled';
  
  -- Calculate rush percentage
  rush_percentage := (booking_count::DECIMAL / daily_capacity) * 100;
  
  -- Determine rush level
  IF rush_percentage >= 80 THEN
    RETURN 'high';
  ELSIF rush_percentage >= 50 THEN
    RETURN 'medium';
  ELSE
    RETURN 'low';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function: Get overall center rush level (average across next 7 days)
CREATE OR REPLACE FUNCTION get_center_overall_rush(p_center_id UUID)
RETURNS TEXT AS $$
DECLARE
  avg_bookings DECIMAL;
  daily_capacity INTEGER;
  rush_percentage DECIMAL;
BEGIN
  -- Get center capacity
  SELECT test_centers.daily_capacity INTO daily_capacity
  FROM test_centers
  WHERE id = p_center_id;
  
  -- Get average bookings for next 7 days
  SELECT AVG(daily_count) INTO avg_bookings
  FROM (
    SELECT COUNT(*) as daily_count
    FROM physical_exam_bookings
    WHERE test_center_id = p_center_id
      AND exam_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
      AND status = 'scheduled'
    GROUP BY exam_date
  ) AS daily_stats;
  
  -- Handle NULL (no bookings)
  avg_bookings := COALESCE(avg_bookings, 0);
  
  -- Calculate rush percentage
  rush_percentage := (avg_bookings / daily_capacity) * 100;
  
  -- Determine rush level
  IF rush_percentage >= 70 THEN
    RETURN 'high';
  ELSIF rush_percentage >= 40 THEN
    RETURN 'medium';
  ELSE
    RETURN 'low';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Updated at triggers
CREATE TRIGGER update_test_centers_updated_at BEFORE UPDATE ON test_centers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON physical_exam_bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- View: Test Centers with Rush Level
CREATE OR REPLACE VIEW test_centers_with_rush AS
SELECT 
  tc.*,
  get_center_overall_rush(tc.id) as rush_level,
  (
    SELECT COUNT(*)
    FROM physical_exam_bookings
    WHERE test_center_id = tc.id
      AND exam_date >= CURRENT_DATE
      AND status = 'scheduled'
  ) as upcoming_bookings
FROM test_centers tc
WHERE tc.is_active = true;

-- Sample Test Centers Data
INSERT INTO test_centers (center_name_en, center_name_bn, office_name_en, office_name_bn, address_en, address_bn, division, district, latitude, longitude, phone, daily_capacity) VALUES
('Dhaka Central Test Center', 'ঢাকা কেন্দ্রীয় পরীক্ষা কেন্দ্র', 'BRTA Dhaka Office', 'বিআরটিএ ঢাকা অফিস', 'Mirpur Road, Dhaka-1216', 'মিরপুর রোড, ঢাকা-১২১৬', 'Dhaka', 'Dhaka', 23.8103, 90.4125, '+88029008990', 100),
('Chittagong Test Center', 'চট্টগ্রাম পরীক্ষা কেন্দ্র', 'BRTA Chittagong Office', 'বিআরটিএ চট্টগ্রাম অফিস', 'Agrabad, Chittagong-4100', 'আগ্রাবাদ, চট্টগ্রাম-৪১০০', 'Chittagong', 'Chittagong', 22.3569, 91.7832, '+88031234567', 80),
('Sylhet Test Center', 'সিলেট পরীক্ষা কেন্দ্র', 'BRTA Sylhet Office', 'বিআরটিএ সিলেট অফিস', 'Zindabazar, Sylhet-3100', 'জিন্দাবাজার, সিলেট-৩১০০', 'Sylhet', 'Sylhet', 24.8949, 91.8687, '+88082134567', 60),
('Rajshahi Test Center', 'রাজশাহী পরীক্ষা কেন্দ্র', 'BRTA Rajshahi Office', 'বিআরটিএ রাজশাহী অফিস', 'Shaheb Bazar, Rajshahi-6100', 'সাহেব বাজার, রাজশাহী-৬১০০', 'Rajshahi', 'Rajshahi', 24.3745, 88.6042, '+88072134567', 70),
('Khulna Test Center', 'খুলনা পরীক্ষা কেন্দ্র', 'BRTA Khulna Office', 'বিআরটিএ খুলনা অফিস', 'Sonadanga, Khulna-9100', 'সোনাডাঙ্গা, খুলনা-৯১০০', 'Khulna', 'Khulna', 22.8456, 89.5403, '+88041234567', 65);

COMMENT ON TABLE test_centers IS 'Physical exam test centers with location data';
COMMENT ON TABLE physical_exam_bookings IS 'User bookings for physical driving tests';
COMMENT ON FUNCTION get_center_rush_level IS 'Calculate rush level (low/medium/high) for a center on a specific date';
COMMENT ON FUNCTION get_center_overall_rush IS 'Calculate overall rush level for a center (next 7 days average)';
