-- =====================================================
-- Vehicle Impoundment/Dumping System (Racker System)
-- =====================================================

-- 1. Vehicle Impoundments Table
CREATE TABLE IF NOT EXISTS vehicle_impoundments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  impound_number VARCHAR(30) UNIQUE NOT NULL,
  
  -- Vehicle & User Info
  registered_vehicle_id UUID REFERENCES registered_vehicles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Police Info
  police_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  police_name VARCHAR(255),
  police_badge_number VARCHAR(50),
  
  -- Impound Details
  reason_code VARCHAR(50) NOT NULL,
  reason_en VARCHAR(255) NOT NULL,
  reason_bn VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Fee Details
  base_impound_fee NUMERIC(10,2) NOT NULL DEFAULT 5000.00,
  daily_storage_fee NUMERIC(10,2) NOT NULL DEFAULT 200.00,
  additional_charges NUMERIC(10,2) DEFAULT 0,
  days_impounded INTEGER DEFAULT 0,
  total_amount NUMERIC(10,2),
  
  -- Location & Time
  impound_location VARCHAR(255),
  impound_location_bn VARCHAR(255),
  impound_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  release_date TIMESTAMP WITH TIME ZONE,
  
  -- Evidence
  photo_evidence_url TEXT,
  notes TEXT,
  
  -- Payment & Status
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  payment_status VARCHAR(20) DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'partial')) NOT NULL,
  paid_at TIMESTAMP WITH TIME ZONE,
  
  status VARCHAR(20) DEFAULT 'impounded' CHECK (status IN ('impounded', 'released', 'cancelled')) NOT NULL,
  release_reason TEXT,
  released_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Impound Reasons (Predefined)
CREATE TABLE IF NOT EXISTS impound_reasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name_en VARCHAR(255) NOT NULL,
  name_bn VARCHAR(255) NOT NULL,
  description_en TEXT,
  description_bn TEXT,
  base_fee NUMERIC(10,2) NOT NULL,
  severity VARCHAR(20) CHECK (severity IN ('minor', 'moderate', 'severe', 'critical')) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert Common Impound Reasons
INSERT INTO impound_reasons (code, name_en, name_bn, description_en, description_bn, base_fee, severity) VALUES
('NO_DOCUMENTS', 'No Valid Documents', 'বৈধ নথিপত্র নেই', 'Vehicle operating without proper registration or license', 'সঠিক নিবন্ধন বা লাইসেন্স ছাড়া গাড়ি চালানো', 5000.00, 'severe'),
('SERIOUS_VIOLATION', 'Serious Traffic Violation', 'গুরুতর ট্রাফিক লঙ্ঘন', 'Multiple violations or dangerous driving', 'একাধিক লঙ্ঘন বা বিপজ্জনক ড্রাইভিং', 7000.00, 'critical'),
('ILLEGAL_PARKING', 'Illegal Parking/Obstruction', 'অবৈধ পার্কিং/বাধা', 'Blocking traffic or emergency routes', 'ট্রাফিক বা জরুরি রাস্তা অবরোধ', 3000.00, 'moderate'),
('UNFIT_VEHICLE', 'Unfit for Road', 'রাস্তার জন্য অযোগ্য', 'Vehicle not meeting safety standards', 'নিরাপত্তা মান পূরণ করছে না', 6000.00, 'severe'),
('EXPIRED_DOCUMENTS', 'Expired Documents', 'মেয়াদোত্তীর্ণ নথি', 'License or registration expired', 'লাইসেন্স বা নিবন্ধন মেয়াদোত্তীর্ণ', 4000.00, 'moderate'),
('ILLEGAL_MODIFICATION', 'Illegal Modification', 'অবৈধ পরিবর্তন', 'Unauthorized vehicle modifications', 'অননুমোদিত গাড়ি পরিবর্তন', 5000.00, 'severe'),
('ABANDONED_VEHICLE', 'Abandoned Vehicle', 'পরিত্যক্ত গাড়ি', 'Vehicle left unattended for extended period', 'দীর্ঘ সময়ের জন্য অযত্ন রেখে গেছে', 3500.00, 'minor'),
('COURT_ORDER', 'Court Order', 'আদালতের আদেশ', 'Impounded by court directive', 'আদালতের নির্দেশে আটক', 8000.00, 'critical')
ON CONFLICT (code) DO NOTHING;

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_vehicle_impoundments_vehicle ON vehicle_impoundments(registered_vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_impoundments_user ON vehicle_impoundments(user_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_impoundments_police ON vehicle_impoundments(police_user_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_impoundments_status ON vehicle_impoundments(status);
CREATE INDEX IF NOT EXISTS idx_vehicle_impoundments_payment ON vehicle_impoundments(payment_status);
CREATE INDEX IF NOT EXISTS idx_vehicle_impoundments_date ON vehicle_impoundments(impound_date);

-- 4. Function to generate impound number
CREATE OR REPLACE FUNCTION generate_impound_number()
RETURNS TEXT AS $$
DECLARE
  year_part TEXT;
  random_part TEXT;
BEGIN
  year_part := TO_CHAR(NOW(), 'YYYY');
  random_part := LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');
  RETURN 'IMP-' || year_part || '-' || random_part;
END;
$$ LANGUAGE plpgsql;

-- 5. Function to calculate total amount based on days
CREATE OR REPLACE FUNCTION calculate_impound_amount()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'impounded' THEN
    -- Calculate days impounded
    NEW.days_impounded := GREATEST(0, EXTRACT(DAY FROM (NOW() - NEW.impound_date))::INTEGER);
    
    -- Calculate total: base fee + (daily storage * days) + additional charges
    NEW.total_amount := NEW.base_impound_fee + 
                       (NEW.daily_storage_fee * NEW.days_impounded) + 
                       COALESCE(NEW.additional_charges, 0);
  END IF;
  
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Trigger to auto-calculate amount
CREATE TRIGGER trigger_calculate_impound_amount
  BEFORE INSERT OR UPDATE ON vehicle_impoundments
  FOR EACH ROW
  EXECUTE FUNCTION calculate_impound_amount();

-- 7. RLS Policies
ALTER TABLE vehicle_impoundments ENABLE ROW LEVEL SECURITY;
ALTER TABLE impound_reasons ENABLE ROW LEVEL SECURITY;

-- Users can view their own impoundments
CREATE POLICY "Users can view their own impoundments"
  ON vehicle_impoundments FOR SELECT
  USING (user_id = auth.uid());

-- Police can view all impoundments
CREATE POLICY "Police can view all impoundments"
  ON vehicle_impoundments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'police'
    )
  );

-- Police can create impoundments
CREATE POLICY "Police can create impoundments"
  ON vehicle_impoundments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'police'
    )
  );

-- Police can update impoundments they created
CREATE POLICY "Police can update impoundments they created"
  ON vehicle_impoundments FOR UPDATE
  USING (
    police_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'police'
    )
  );

-- Admin can manage all impoundments
CREATE POLICY "Admin can manage all impoundments"
  ON vehicle_impoundments
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Everyone can view impound reasons
CREATE POLICY "Anyone can view impound reasons"
  ON impound_reasons FOR SELECT
  USING (is_active = true);

-- 8. View for detailed impoundment info
CREATE OR REPLACE VIEW impoundment_details AS
SELECT 
  vi.*,
  rv.registration_number,
  rv.registration_plate,
  rv.vehicle_name,
  rv.model,
  rv.engine_number,
  rv.owner_name_en,
  rv.owner_name_bn,
  p.full_name as user_full_name,
  p.phone as user_phone,
  p.email as user_email,
  pp.full_name as police_full_name,
  ir.name_en as reason_name_en,
  ir.name_bn as reason_name_bn
FROM vehicle_impoundments vi
LEFT JOIN registered_vehicles rv ON vi.registered_vehicle_id = rv.id
LEFT JOIN profiles p ON vi.user_id = p.id
LEFT JOIN profiles pp ON vi.police_user_id = pp.id
LEFT JOIN impound_reasons ir ON vi.reason_code = ir.code;

-- Success message
DO $$ 
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '🚗 Vehicle Impoundment System Setup Complete!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '📊 Tables Created: 2 (vehicle_impoundments, impound_reasons)';
  RAISE NOTICE '📋 Impound Reasons: 8 predefined reasons';
  RAISE NOTICE '🔧 Functions: 2 (number generation, amount calculation)';
  RAISE NOTICE '⚡ Triggers: 1 (auto-calculate amount)';
  RAISE NOTICE '🔒 RLS Policies: Enabled';
  RAISE NOTICE '👁️ Views: 1 (impoundment_details)';
  RAISE NOTICE '💰 Fee Structure: Base fee + Daily storage (BDT 200/day)';
  RAISE NOTICE '🚀 Ready for police to impound vehicles!';
END $$;
