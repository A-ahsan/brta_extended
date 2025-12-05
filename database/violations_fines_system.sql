-- =====================================================
-- BRTA Violations & Fines System (Mamla System)
-- Complete Database Schema
-- =====================================================

-- 1. Violation Types Table (Predefined Traffic Violations)
CREATE TABLE IF NOT EXISTS violation_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) UNIQUE NOT NULL,
  name_en VARCHAR(255) NOT NULL,
  name_bn VARCHAR(255) NOT NULL,
  description_en TEXT,
  description_bn TEXT,
  base_fine_amount NUMERIC(10,2) NOT NULL,
  severity VARCHAR(20) CHECK (severity IN ('minor', 'moderate', 'severe', 'critical')) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert Common Traffic Violations
INSERT INTO violation_types (code, name_en, name_bn, description_en, description_bn, base_fine_amount, severity) VALUES
('OVERSPEED', 'Over Speeding', 'অতিরিক্ত গতি', 'Driving above the speed limit', 'গতিসীমার উপরে গাড়ি চালানো', 2000.00, 'moderate'),
('NO_LICENSE', 'Driving Without License', 'লাইসেন্স ছাড়া গাড়ি চালানো', 'Operating vehicle without valid driving license', 'বৈধ ড্রাইভিং লাইসেন্স ছাড়া গাড়ি চালানো', 5000.00, 'severe'),
('NO_HELMET', 'No Helmet', 'হেলমেট ছাড়া', 'Riding motorcycle without helmet', 'হেলমেট ছাড়া মোটরসাইকেল চালানো', 500.00, 'minor'),
('RED_LIGHT', 'Signal Violation', 'সংকেত লঙ্ঘন', 'Crossing red light signal', 'লাল সংকেত অতিক্রম করা', 1500.00, 'moderate'),
('WRONG_SIDE', 'Wrong Side Driving', 'ভুল পাশে চালানো', 'Driving on wrong side of road', 'রাস্তার ভুল পাশে গাড়ি চালানো', 3000.00, 'severe'),
('NO_PARKING', 'Illegal Parking', 'অবৈধ পার্কিং', 'Parking in no-parking zone', 'নো-পার্কিং এলাকায় পার্কিং', 1000.00, 'minor'),
('DRUNK_DRIVE', 'Drunk Driving', 'মাতাল অবস্থায় গাড়ি চালানো', 'Driving under influence of alcohol', 'মদ্যপ অবস্থায় গাড়ি চালানো', 10000.00, 'critical'),
('NO_SEATBELT', 'Not Using Seatbelt', 'সিটবেল্ট ব্যবহার না করা', 'Driver/passenger not wearing seatbelt', 'চালক/যাত্রী সিটবেল্ট পরছেন না', 500.00, 'minor'),
('MOBILE_USE', 'Mobile Phone Use While Driving', 'গাড়ি চালানোর সময় মোবাইল ব্যবহার', 'Using mobile phone while driving', 'গাড়ি চালানোর সময় মোবাইল ফোন ব্যবহার', 1000.00, 'moderate'),
('NO_INSURANCE', 'No Valid Insurance', 'বৈধ বীমা নেই', 'Operating vehicle without valid insurance', 'বৈধ বীমা ছাড়া গাড়ি চালানো', 5000.00, 'severe'),
('EXPIRED_TAX', 'Expired Tax Token', 'মেয়াদোত্তীর্ণ ট্যাক্স টোকেন', 'Operating vehicle with expired tax token', 'মেয়াদোত্তীর্ণ ট্যাক্স টোকেন সহ গাড়ি চালানো', 3000.00, 'severe'),
('OVERLOAD', 'Overloading', 'অতিরিক্ত ওজন', 'Carrying more than permitted load/passengers', 'অনুমোদিত ভার/যাত্রীর চেয়ে বেশি বহন', 2500.00, 'moderate'),
('RASH_DRIVE', 'Rash & Negligent Driving', 'বেপরোয়া ও অসাবধানে গাড়ি চালানো', 'Driving rashly and negligently', 'বেপরোয়া এবং অসাবধানে গাড়ি চালানো', 5000.00, 'severe'),
('NO_REGISTRATION', 'No Registration Papers', 'নিবন্ধন কাগজ নেই', 'Vehicle documents not available', 'গাড়ির নথিপত্র উপলব্ধ নয়', 2000.00, 'moderate'),
('POLLUTION', 'Excessive Pollution', 'অতিরিক্ত দূষণ', 'Vehicle emitting excessive smoke/pollution', 'অতিরিক্ত ধোঁয়া/দূষণ নির্গমনকারী গাড়ি', 1500.00, 'moderate')
ON CONFLICT (code) DO NOTHING;

-- 2. Traffic Violations Table (Actual Violations Issued by Police)
CREATE TABLE IF NOT EXISTS traffic_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  violation_number VARCHAR(30) UNIQUE NOT NULL,
  
  -- Vehicle & User Info
  registered_vehicle_id UUID REFERENCES registered_vehicles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Police Info
  police_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  police_name VARCHAR(255),
  police_badge_number VARCHAR(50),
  
  -- Violation Details
  violation_type_id UUID REFERENCES violation_types(id) ON DELETE SET NULL,
  violation_code VARCHAR(20) NOT NULL,
  violation_name_en VARCHAR(255) NOT NULL,
  violation_name_bn VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Fine Details
  fine_amount NUMERIC(10,2) NOT NULL,
  additional_charges NUMERIC(10,2) DEFAULT 0,
  total_amount NUMERIC(10,2) GENERATED ALWAYS AS (fine_amount + additional_charges) STORED,
  
  -- Location & Time
  location VARCHAR(255),
  location_bn VARCHAR(255),
  violation_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Evidence
  photo_evidence_url TEXT,
  video_evidence_url TEXT,
  notes TEXT,
  
  -- Payment Status
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  payment_status VARCHAR(20) DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'partial')) NOT NULL,
  paid_at TIMESTAMP WITH TIME ZONE,
  
  -- Status
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'waived', 'appealed', 'expired')) NOT NULL,
  waived_reason TEXT,
  waived_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  waived_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Violation History (For tracking multiple violations on same vehicle)
CREATE TABLE IF NOT EXISTS violation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registered_vehicle_id UUID REFERENCES registered_vehicles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  total_violations INTEGER DEFAULT 0,
  total_fines_paid NUMERIC(10,2) DEFAULT 0,
  total_fines_pending NUMERIC(10,2) DEFAULT 0,
  last_violation_date TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_violation_types_code ON violation_types(code);
CREATE INDEX IF NOT EXISTS idx_violation_types_severity ON violation_types(severity);
CREATE INDEX IF NOT EXISTS idx_violation_types_active ON violation_types(is_active);

CREATE INDEX IF NOT EXISTS idx_traffic_violations_vehicle ON traffic_violations(registered_vehicle_id);
CREATE INDEX IF NOT EXISTS idx_traffic_violations_user ON traffic_violations(user_id);
CREATE INDEX IF NOT EXISTS idx_traffic_violations_police ON traffic_violations(police_user_id);
CREATE INDEX IF NOT EXISTS idx_traffic_violations_number ON traffic_violations(violation_number);
CREATE INDEX IF NOT EXISTS idx_traffic_violations_payment_status ON traffic_violations(payment_status);
CREATE INDEX IF NOT EXISTS idx_traffic_violations_status ON traffic_violations(status);
CREATE INDEX IF NOT EXISTS idx_traffic_violations_date ON traffic_violations(violation_date);

CREATE INDEX IF NOT EXISTS idx_violation_history_vehicle ON violation_history(registered_vehicle_id);
CREATE INDEX IF NOT EXISTS idx_violation_history_user ON violation_history(user_id);

-- =====================================================
-- DATABASE FUNCTIONS
-- =====================================================

-- Function to generate violation number
CREATE OR REPLACE FUNCTION generate_violation_number()
RETURNS TEXT AS $$
DECLARE
  year_part TEXT;
  random_part TEXT;
BEGIN
  year_part := TO_CHAR(NOW(), 'YYYY');
  random_part := LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');
  RETURN 'VIO-' || year_part || '-' || random_part;
END;
$$ LANGUAGE plpgsql;

-- Function to update violation history when new violation is added
CREATE OR REPLACE FUNCTION update_violation_history()
RETURNS TRIGGER AS $$
DECLARE
  v_total_violations INTEGER;
  v_total_paid NUMERIC(10,2);
  v_total_pending NUMERIC(10,2);
  v_last_date TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Calculate totals for this vehicle
  SELECT 
    COUNT(*),
    COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN payment_status = 'unpaid' THEN total_amount ELSE 0 END), 0),
    MAX(violation_date)
  INTO v_total_violations, v_total_paid, v_total_pending, v_last_date
  FROM traffic_violations
  WHERE registered_vehicle_id = NEW.registered_vehicle_id
    AND status = 'active';
  
  -- Upsert violation history
  INSERT INTO violation_history (
    registered_vehicle_id,
    user_id,
    total_violations,
    total_fines_paid,
    total_fines_pending,
    last_violation_date,
    updated_at
  ) VALUES (
    NEW.registered_vehicle_id,
    NEW.user_id,
    v_total_violations,
    v_total_paid,
    v_total_pending,
    v_last_date,
    NOW()
  )
  ON CONFLICT (registered_vehicle_id) 
  DO UPDATE SET
    total_violations = v_total_violations,
    total_fines_paid = v_total_paid,
    total_fines_pending = v_total_pending,
    last_violation_date = v_last_date,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add unique constraint to violation_history
ALTER TABLE violation_history 
  DROP CONSTRAINT IF EXISTS violation_history_vehicle_unique;
ALTER TABLE violation_history 
  ADD CONSTRAINT violation_history_vehicle_unique 
  UNIQUE (registered_vehicle_id);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Auto-update updated_at column for violation_types
CREATE OR REPLACE FUNCTION update_violation_types_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_violation_types_updated_at
BEFORE UPDATE ON violation_types
FOR EACH ROW EXECUTE FUNCTION update_violation_types_updated_at();

-- Auto-update updated_at column for traffic_violations
CREATE OR REPLACE FUNCTION update_traffic_violations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_traffic_violations_updated_at
BEFORE UPDATE ON traffic_violations
FOR EACH ROW EXECUTE FUNCTION update_traffic_violations_updated_at();

-- Trigger to update violation history
CREATE TRIGGER trigger_update_violation_history
AFTER INSERT OR UPDATE ON traffic_violations
FOR EACH ROW EXECUTE FUNCTION update_violation_history();

-- =====================================================
-- RLS POLICIES (Row Level Security)
-- =====================================================

-- Enable RLS
ALTER TABLE violation_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE traffic_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE violation_history ENABLE ROW LEVEL SECURITY;

-- Violation Types Policies (Public Read, Admin Write)
CREATE POLICY "Anyone can view active violation types"
  ON violation_types FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage violation types"
  ON violation_types FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Traffic Violations Policies
CREATE POLICY "Users can view their own violations"
  ON traffic_violations FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Police can view all violations"
  ON traffic_violations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'police'
    )
  );

CREATE POLICY "Police can create violations"
  ON traffic_violations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'police'
    )
  );

CREATE POLICY "Police can update violations they created"
  ON traffic_violations FOR UPDATE
  USING (
    police_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'police'
    )
  );

CREATE POLICY "Admins can manage all violations"
  ON traffic_violations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Violation History Policies
CREATE POLICY "Users can view their violation history"
  ON violation_history FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Police can view all violation history"
  ON violation_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('police', 'admin')
    )
  );

-- =====================================================
-- HELPER VIEWS
-- =====================================================

-- View for complete violation details with vehicle info
CREATE OR REPLACE VIEW violation_details AS
SELECT 
  tv.id,
  tv.violation_number,
  tv.violation_name_en,
  tv.violation_name_bn,
  tv.fine_amount,
  tv.additional_charges,
  tv.total_amount,
  tv.location,
  tv.location_bn,
  tv.violation_date,
  tv.payment_status,
  tv.status,
  tv.description,
  tv.notes,
  tv.photo_evidence_url,
  -- Vehicle Info
  rv.registration_number,
  rv.registration_plate,
  rv.vehicle_name,
  rv.model,
  rv.engine_number,
  rv.owner_name_en,
  rv.owner_name_bn,
  -- User Info
  tv.user_id,
  p.full_name as user_full_name,
  p.phone as user_phone,
  -- Police Info
  tv.police_name,
  tv.police_badge_number,
  pp.full_name as police_full_name
FROM traffic_violations tv
LEFT JOIN registered_vehicles rv ON tv.registered_vehicle_id = rv.id
LEFT JOIN profiles p ON tv.user_id = p.id
LEFT JOIN profiles pp ON tv.police_user_id = pp.id;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Violations & Fines System Setup Complete!';
  RAISE NOTICE '📊 Tables Created: 3 (violation_types, traffic_violations, violation_history)';
  RAISE NOTICE '📋 Violation Types Inserted: 15 common traffic violations';
  RAISE NOTICE '🔧 Functions Created: 2 (violation_number, update_violation_history)';
  RAISE NOTICE '⚡ Indexes Created: 11';
  RAISE NOTICE '🔄 Triggers Created: 3';
  RAISE NOTICE '🔒 RLS Policies: Enabled with proper access control';
  RAISE NOTICE '👁️ Views Created: 1 (violation_details)';
  RAISE NOTICE '🌐 Bilingual Support: ✅ (English + Bengali)';
  RAISE NOTICE '🚀 Ready for Police to add violations and users to pay fines!';
END $$;
