-- =====================================================
-- BRTA Vehicle Registration System - Complete Schema
-- Phase 1: Database Setup
-- =====================================================

-- 2. Add engine_cc to existing vehicles table
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS engine_cc INTEGER;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS registration_plate JSONB; -- Bilingual: {"en": "...", "bn": "..."}

-- 2. Bangladesh Divisions for Number Plate Generation
CREATE TABLE IF NOT EXISTS bd_divisions (
  id SERIAL PRIMARY KEY,
  division_name_en VARCHAR(50) NOT NULL,
  division_name_bn VARCHAR(50) NOT NULL,
  division_code VARCHAR(20) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert Bangladesh Divisions
INSERT INTO bd_divisions (division_name_en, division_name_bn, division_code) VALUES
('Dhaka Metro', 'ঢাকা মেট্রো', 'DHAKA-METRO'),
('Chattogram Metro', 'চট্টগ্রাম মেট্রো', 'CHATTOGRAM-METRO'),
('Barishal Metro', 'বরিশাল মেট্রো', 'BARISHAL-METRO'),
('Khulna Metro', 'খুলনা মেট্রো', 'KHULNA-METRO'),
('Rajshahi Metro', 'রাজশাহী মেট্রো', 'RAJSHAHI-METRO'),
('Sylhet Metro', 'সিলেট মেট্রো', 'SYLHET-METRO'),
('Rangpur Metro', 'রংপুর মেট্রো', 'RANGPUR-METRO'),
('Mymensingh Metro', 'ময়মনসিংহ মেট্রো', 'MYMENSINGH-METRO')
ON CONFLICT (division_code) DO NOTHING;

-- 3. Vehicle Registration Applications Table
CREATE TABLE IF NOT EXISTS vehicle_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_number VARCHAR(30) UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
  
  -- Registration Details
  division_code VARCHAR(20) NOT NULL,
  registration_period INTEGER NOT NULL CHECK (registration_period >= 1 AND registration_period <= 5),
  registration_fee NUMERIC(10,2) NOT NULL,
  
  -- Image
  vehicle_photo_url TEXT,
  use_dl_photo BOOLEAN DEFAULT false,
  
  -- Payment
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed')),
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')) NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Registered Vehicles Table (After Successful Registration)
CREATE TABLE IF NOT EXISTS registered_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_number VARCHAR(50) UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
  application_id UUID REFERENCES vehicle_registrations(id) ON DELETE SET NULL,
  
  -- Registration Details
  registration_plate JSONB NOT NULL, -- Bilingual: {"en": "DHAKA-METRO-GA-12-3456", "bn": "ঢাকা-মেট্রো-GA-১২-৩৪৫৬"}
  division_code VARCHAR(20) NOT NULL,
  vehicle_photo_url TEXT,
  
  -- Owner Details (from user)
  owner_name_en VARCHAR(255) NOT NULL,
  owner_name_bn VARCHAR(255) NOT NULL,
  owner_nid VARCHAR(20) NOT NULL,
  owner_dl_number VARCHAR(30),
  
  -- Vehicle Details (from vehicles table)
  vehicle_name TEXT NOT NULL,
  model TEXT NOT NULL,
  engine_number TEXT NOT NULL,
  engine_cc INTEGER NOT NULL,
  vehicle_type VARCHAR(10) NOT NULL,
  
  -- Registration Validity
  registration_date DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE NOT NULL,
  
  -- QR Code Data (JSON - stores all info for scanning)
  qr_code_data JSONB,
  
  -- Status
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'expired')) NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Tax Tokens Table (Annual Renewal)
CREATE TABLE IF NOT EXISTS tax_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_number VARCHAR(30) UNIQUE NOT NULL,
  registered_vehicle_id UUID REFERENCES registered_vehicles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Token Details
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE NOT NULL,
  tax_year VARCHAR(10) NOT NULL,
  amount_paid NUMERIC(10,2) NOT NULL,
  
  -- Payment
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  
  -- Status
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired')) NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Police Inspections Table
CREATE TABLE IF NOT EXISTS police_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registered_vehicle_id UUID REFERENCES registered_vehicles(id) ON DELETE CASCADE,
  police_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Inspection Details
  inspection_type VARCHAR(30) NOT NULL CHECK (inspection_type IN ('routine_check', 'warning_issued', 'fine_issued', 'document_requested')),
  inspection_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  location VARCHAR(255),
  remarks TEXT,
  
  -- Fine Reference (if type is fine_issued)
  fine_id UUID,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Traffic Fines Table
CREATE TABLE IF NOT EXISTS traffic_fines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fine_number VARCHAR(30) UNIQUE NOT NULL,
  registered_vehicle_id UUID REFERENCES registered_vehicles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  police_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Fine Details
  violation_type VARCHAR(50) NOT NULL,
  violation_description TEXT,
  fine_amount NUMERIC(10,2) NOT NULL,
  location VARCHAR(255),
  violation_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Payment
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  payment_status VARCHAR(20) DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid')) NOT NULL,
  paid_at TIMESTAMP WITH TIME ZONE,
  
  -- Status
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'waived', 'expired')) NOT NULL,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Vehicle Registrations
CREATE INDEX IF NOT EXISTS idx_vehicle_reg_user_id ON vehicle_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_reg_vehicle_id ON vehicle_registrations(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_reg_status ON vehicle_registrations(status);
CREATE INDEX IF NOT EXISTS idx_vehicle_reg_app_number ON vehicle_registrations(application_number);

-- Registered Vehicles
CREATE INDEX IF NOT EXISTS idx_registered_vehicles_user_id ON registered_vehicles(user_id);
CREATE INDEX IF NOT EXISTS idx_registered_vehicles_vehicle_id ON registered_vehicles(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_registered_vehicles_plate_en ON registered_vehicles((registration_plate->>'en'));
CREATE INDEX IF NOT EXISTS idx_registered_vehicles_reg_number ON registered_vehicles(registration_number);
CREATE INDEX IF NOT EXISTS idx_registered_vehicles_status ON registered_vehicles(status);

-- Tax Tokens
CREATE INDEX IF NOT EXISTS idx_tax_tokens_vehicle_id ON tax_tokens(registered_vehicle_id);
CREATE INDEX IF NOT EXISTS idx_tax_tokens_user_id ON tax_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_tax_tokens_status ON tax_tokens(status);
CREATE INDEX IF NOT EXISTS idx_tax_tokens_token_number ON tax_tokens(token_number);

-- Police Inspections
CREATE INDEX IF NOT EXISTS idx_police_inspections_vehicle_id ON police_inspections(registered_vehicle_id);
CREATE INDEX IF NOT EXISTS idx_police_inspections_police_id ON police_inspections(police_user_id);
CREATE INDEX IF NOT EXISTS idx_police_inspections_type ON police_inspections(inspection_type);

-- Traffic Fines
CREATE INDEX IF NOT EXISTS idx_traffic_fines_vehicle_id ON traffic_fines(registered_vehicle_id);
CREATE INDEX IF NOT EXISTS idx_traffic_fines_user_id ON traffic_fines(user_id);
CREATE INDEX IF NOT EXISTS idx_traffic_fines_status ON traffic_fines(payment_status);
CREATE INDEX IF NOT EXISTS idx_traffic_fines_fine_number ON traffic_fines(fine_number);

-- =====================================================
-- DATABASE FUNCTIONS
-- =====================================================

-- Function to generate registration application number
CREATE OR REPLACE FUNCTION generate_vehicle_registration_application_number()
RETURNS TEXT AS $$
DECLARE
  year_part TEXT;
  random_part TEXT;
BEGIN
  year_part := TO_CHAR(NOW(), 'YY');
  random_part := LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');
  RETURN 'VR' || year_part || random_part;
END;
$$ LANGUAGE plpgsql;

-- Function to generate registration plate number (Bilingual)
-- Format: DHAKA-METRO-GA-12-3456
-- Returns JSON: {"en": "DHAKA-METRO-GA-12-3456", "bn": "ঢাকা-মেট্রো-GA-১২-৩৪৫৬"}
CREATE OR REPLACE FUNCTION generate_registration_plate(
  p_division_code VARCHAR,
  p_vehicle_type VARCHAR,
  p_engine_cc INTEGER
)
RETURNS JSONB AS $$
DECLARE
  v_series_code VARCHAR(2);
  v_class_number TEXT;
  v_serial_number TEXT;
  v_plate_en TEXT;
  v_plate_bn TEXT;
  v_exists BOOLEAN;
  v_division_bn TEXT;
  v_class_bn TEXT;
  v_serial_bn TEXT;
BEGIN
  -- Determine series code based on vehicle type and CC
  IF p_vehicle_type = 'Bike' THEN
    IF p_engine_cc <= 150 THEN
      v_series_code := 'LA'; -- Light Bike
    ELSE
      v_series_code := 'TA'; -- Heavy Bike
    END IF;
  ELSE -- Car
    IF p_engine_cc <= 1500 THEN
      v_series_code := 'GA'; -- Light Car
    ELSE
      v_series_code := 'HA'; -- Heavy Car
    END IF;
  END IF;
  
  -- Get Bengali division name
  SELECT division_name_bn INTO v_division_bn 
  FROM bd_divisions 
  WHERE division_code = p_division_code;
  
  -- Generate class number (01-99)
  v_class_number := LPAD(FLOOR(RANDOM() * 99 + 1)::TEXT, 2, '0');
  
  -- Try to generate unique serial number
  FOR i IN 1..100 LOOP
    v_serial_number := LPAD(FLOOR(RANDOM() * 9999 + 1)::TEXT, 4, '0');
    v_plate_en := p_division_code || '-' || v_series_code || '-' || v_class_number || '-' || v_serial_number;
    
    -- Check if exists
    SELECT EXISTS(SELECT 1 FROM registered_vehicles WHERE registration_plate->>'en' = v_plate_en) INTO v_exists;
    
    IF NOT v_exists THEN
      -- Convert numbers to Bengali
      v_class_bn := TRANSLATE(v_class_number, '0123456789', '০১২৩৪৫৬৭৮৯');
      v_serial_bn := TRANSLATE(v_serial_number, '0123456789', '০১২৩৪৫৬৭৮৯');
      
      -- Create Bengali plate
      v_plate_bn := v_division_bn || '-' || v_series_code || '-' || v_class_bn || '-' || v_serial_bn;
      
      -- Return bilingual JSON
      RETURN jsonb_build_object(
        'en', v_plate_en,
        'bn', v_plate_bn
      );
    END IF;
  END LOOP;
  
  -- If still not unique after 100 tries, raise error
  RAISE EXCEPTION 'Could not generate unique registration plate';
END;
$$ LANGUAGE plpgsql;

-- Function to generate registration number (certificate number)
CREATE OR REPLACE FUNCTION generate_registration_number()
RETURNS TEXT AS $$
DECLARE
  year_part TEXT;
  random_part TEXT;
BEGIN
  year_part := TO_CHAR(NOW(), 'YYYY');
  random_part := LPAD(FLOOR(RANDOM() * 9999999)::TEXT, 7, '0');
  RETURN 'REG' || year_part || random_part;
END;
$$ LANGUAGE plpgsql;

-- Function to generate tax token number
CREATE OR REPLACE FUNCTION generate_tax_token_number()
RETURNS TEXT AS $$
DECLARE
  year_part TEXT;
  random_part TEXT;
BEGIN
  year_part := TO_CHAR(NOW(), 'YY');
  random_part := LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');
  RETURN 'TAX' || year_part || random_part;
END;
$$ LANGUAGE plpgsql;

-- Function to generate fine number
CREATE OR REPLACE FUNCTION generate_fine_number()
RETURNS TEXT AS $$
DECLARE
  year_part TEXT;
  random_part TEXT;
BEGIN
  year_part := TO_CHAR(NOW(), 'YY');
  random_part := LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');
  RETURN 'FINE' || year_part || random_part;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Auto-update updated_at column for vehicle_registrations
CREATE OR REPLACE FUNCTION update_vehicle_registrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_vehicle_registrations_updated_at
BEFORE UPDATE ON vehicle_registrations
FOR EACH ROW EXECUTE FUNCTION update_vehicle_registrations_updated_at();

-- Auto-update updated_at column for registered_vehicles
CREATE OR REPLACE FUNCTION update_registered_vehicles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_registered_vehicles_updated_at
BEFORE UPDATE ON registered_vehicles
FOR EACH ROW EXECUTE FUNCTION update_registered_vehicles_updated_at();

-- Auto-update updated_at column for traffic_fines
CREATE OR REPLACE FUNCTION update_traffic_fines_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_traffic_fines_updated_at
BEFORE UPDATE ON traffic_fines
FOR EACH ROW EXECUTE FUNCTION update_traffic_fines_updated_at();

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Phase 1: Database Setup Complete!';
  RAISE NOTICE '📊 Tables Created: 6 (vehicle_registrations, registered_vehicles, tax_tokens, police_inspections, traffic_fines, bd_divisions)';
  RAISE NOTICE '🔧 Columns Added: 2 (vehicles.engine_cc, vehicles.registration_plate as JSONB)';
  RAISE NOTICE '📋 Functions Created: 5 (application_number, registration_plate, registration_number, tax_token_number, fine_number)';
  RAISE NOTICE '⚡ Indexes Created: 20';
  RAISE NOTICE '🔄 Triggers Created: 3';
  RAISE NOTICE '🌐 Bilingual Number Plates: ✅ (English + Bengali)';
  RAISE NOTICE '🔓 RLS: Disabled (No policies)';
  RAISE NOTICE '🚀 Ready to execute in Supabase!';
END $$;
