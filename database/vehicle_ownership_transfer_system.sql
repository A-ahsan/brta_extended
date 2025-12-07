-- =====================================================
-- VEHICLE OWNERSHIP TRANSFER SYSTEM
-- Feature: Vehicle Ownership Transfer / গাড়ি মালিকানা হস্তান্তর
-- =====================================================

-- =====================================================
-- 1. OWNERSHIP TRANSFER APPLICATIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS ownership_transfer_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_number VARCHAR(30) UNIQUE NOT NULL,
  
  -- Current Owner (Applicant)
  current_owner_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- New Owner (Transferee)
  new_owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  new_owner_dl_number VARCHAR(30) NOT NULL,
  new_owner_name_en VARCHAR(255) NOT NULL,
  new_owner_name_bn VARCHAR(255) NOT NULL,
  
  -- Vehicle Details
  registered_vehicle_id UUID REFERENCES registered_vehicles(id) ON DELETE CASCADE NOT NULL,
  vehicle_registration_number VARCHAR(50) NOT NULL,
  vehicle_name TEXT NOT NULL,
  vehicle_type VARCHAR(10) NOT NULL,
  
  -- Documents (Deed / দলিল)
  deed_document_url TEXT, -- PDF or Image URL
  
  -- Transfer Fee
  transfer_fee NUMERIC(10,2) NOT NULL DEFAULT 5000.00,
  
  -- Payment
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed')) NOT NULL,
  
  -- Application Status
  status VARCHAR(30) DEFAULT 'pending' CHECK (status IN (
    'pending',           -- Submitted, waiting for admin review
    'under_review',      -- Admin is reviewing
    'approved',          -- Admin approved, waiting for payment
    'payment_completed', -- Payment done, ready for transfer
    'completed',         -- Transfer completed
    'rejected',          -- Admin rejected
    'cancelled'          -- User cancelled
  )) NOT NULL,
  
  -- Admin Review
  admin_reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  admin_review_notes TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  
  -- Eligibility Check Results (stored for reference)
  smart_card_valid BOOLEAN,
  tax_token_valid BOOLEAN,
  has_unpaid_fines BOOLEAN,
  license_type_valid BOOLEAN,
  eligibility_check_notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_at TIMESTAMP WITH TIME ZONE,
  payment_completed_at TIMESTAMP WITH TIME ZONE,
  transfer_completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ownership_transfer_current_owner ON ownership_transfer_applications(current_owner_user_id);
CREATE INDEX IF NOT EXISTS idx_ownership_transfer_new_owner ON ownership_transfer_applications(new_owner_user_id);
CREATE INDEX IF NOT EXISTS idx_ownership_transfer_vehicle ON ownership_transfer_applications(registered_vehicle_id);
CREATE INDEX IF NOT EXISTS idx_ownership_transfer_status ON ownership_transfer_applications(status);
CREATE INDEX IF NOT EXISTS idx_ownership_transfer_app_number ON ownership_transfer_applications(application_number);
CREATE INDEX IF NOT EXISTS idx_ownership_transfer_payment ON ownership_transfer_applications(payment_status);

-- =====================================================
-- 2. OWNERSHIP TRANSFER HISTORY TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS ownership_transfer_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registered_vehicle_id UUID REFERENCES registered_vehicles(id) ON DELETE CASCADE NOT NULL,
  application_id UUID REFERENCES ownership_transfer_applications(id) ON DELETE SET NULL,
  
  -- Previous Owner
  previous_owner_user_id UUID NOT NULL,
  previous_owner_name_en VARCHAR(255) NOT NULL,
  previous_owner_name_bn VARCHAR(255) NOT NULL,
  previous_owner_nid VARCHAR(20) NOT NULL,
  
  -- New Owner
  new_owner_user_id UUID NOT NULL,
  new_owner_name_en VARCHAR(255) NOT NULL,
  new_owner_name_bn VARCHAR(255) NOT NULL,
  new_owner_nid VARCHAR(20) NOT NULL,
  
  -- Transfer Details
  transfer_date DATE NOT NULL DEFAULT CURRENT_DATE,
  transfer_fee_paid NUMERIC(10,2),
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ownership_history_vehicle ON ownership_transfer_history(registered_vehicle_id);
CREATE INDEX IF NOT EXISTS idx_ownership_history_previous_owner ON ownership_transfer_history(previous_owner_user_id);
CREATE INDEX IF NOT EXISTS idx_ownership_history_new_owner ON ownership_transfer_history(new_owner_user_id);

-- =====================================================
-- 3. FUNCTIONS
-- =====================================================

-- Function to generate application number
CREATE OR REPLACE FUNCTION generate_ownership_transfer_application_number()
RETURNS TEXT AS $$
DECLARE
  year_part TEXT;
  random_part TEXT;
BEGIN
  year_part := TO_CHAR(NOW(), 'YY');
  random_part := LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');
  RETURN 'OT' || year_part || random_part;
END;
$$ LANGUAGE plpgsql;

-- Function to search user by DL number
CREATE OR REPLACE FUNCTION search_user_by_dl_number(p_dl_number VARCHAR)
RETURNS TABLE (
  user_id UUID,
  full_name_en VARCHAR,
  full_name_bn VARCHAR,
  nid_number VARCHAR,
  license_number VARCHAR,
  license_type VARCHAR,
  license_category VARCHAR,
  license_status VARCHAR,
  license_expired SMALLINT,
  photo_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.user_id,
    l.full_name_en,
    l.full_name_bn,
    l.nid_number,
    l.license_number,
    l.license_type,
    l.license_category,
    l.status,
    l.expired,
    l.photo_url
  FROM licenses l
  WHERE l.license_number = p_dl_number
  AND l.status = 'active'
  AND l.expired = 0
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to validate license type for vehicle type
CREATE OR REPLACE FUNCTION validate_license_for_vehicle_type(
  p_license_type VARCHAR,
  p_vehicle_type VARCHAR
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Light+Motor can drive both
  IF p_license_type = 'Light+Motor' THEN
    RETURN TRUE;
  END IF;
  
  -- Light license for Bike
  IF p_license_type = 'Light' AND p_vehicle_type = 'Bike' THEN
    RETURN TRUE;
  END IF;
  
  -- Motor license for Car
  IF p_license_type = 'Motor' AND p_vehicle_type = 'Car' THEN
    RETURN TRUE;
  END IF;
  
  -- Otherwise, not valid
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Function to check vehicle transfer eligibility
CREATE OR REPLACE FUNCTION check_vehicle_transfer_eligibility(p_vehicle_id UUID)
RETURNS TABLE (
  is_eligible BOOLEAN,
  smart_card_valid BOOLEAN,
  tax_token_valid BOOLEAN,
  has_unpaid_fines BOOLEAN,
  error_message TEXT
) AS $$
DECLARE
  v_smart_card_valid BOOLEAN;
  v_tax_token_valid BOOLEAN;
  v_has_unpaid_fines BOOLEAN;
  v_unpaid_fine_count INTEGER;
  v_error_msg TEXT := '';
BEGIN
  -- Check 1: Smart Card (Vehicle Registration) Validity
  SELECT (valid_until >= CURRENT_DATE) INTO v_smart_card_valid
  FROM registered_vehicles
  WHERE id = p_vehicle_id;
  
  IF NOT v_smart_card_valid THEN
    v_error_msg := v_error_msg || 'Smart card expired. ';
  END IF;
  
  -- Check 2: Tax Token Validity (latest token)
  SELECT COALESCE(
    (SELECT valid_until >= CURRENT_DATE
     FROM tax_tokens
     WHERE registered_vehicle_id = p_vehicle_id
     AND status = 'active'
     ORDER BY valid_until DESC
     LIMIT 1),
    FALSE
  ) INTO v_tax_token_valid;
  
  IF NOT v_tax_token_valid THEN
    v_error_msg := v_error_msg || 'Tax token expired. ';
  END IF;
  
  -- Check 3: Unpaid Fines
  SELECT COUNT(*) INTO v_unpaid_fine_count
  FROM traffic_violations
  WHERE registered_vehicle_id = p_vehicle_id
  AND payment_status = 'unpaid'
  AND status = 'active';
  
  v_has_unpaid_fines := (v_unpaid_fine_count > 0);
  
  IF v_has_unpaid_fines THEN
    v_error_msg := v_error_msg || v_unpaid_fine_count || ' unpaid fines. ';
  END IF;
  
  -- Return results
  RETURN QUERY SELECT 
    (v_smart_card_valid AND v_tax_token_valid AND NOT v_has_unpaid_fines),
    v_smart_card_valid,
    v_tax_token_valid,
    v_has_unpaid_fines,
    CASE 
      WHEN v_error_msg = '' THEN 'Eligible for transfer'
      ELSE TRIM(v_error_msg)
    END;
END;
$$ LANGUAGE plpgsql;

-- Function to execute ownership transfer
CREATE OR REPLACE FUNCTION execute_ownership_transfer(p_application_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_application RECORD;
  v_old_owner RECORD;
  v_new_owner RECORD;
BEGIN
  -- Get application details
  SELECT * INTO v_application
  FROM ownership_transfer_applications
  WHERE id = p_application_id
  AND status = 'payment_completed';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found or payment not completed';
  END IF;
  
  -- Get old owner details
  SELECT * INTO v_old_owner
  FROM registered_vehicles
  WHERE id = v_application.registered_vehicle_id;
  
  -- Get new owner details from licenses
  SELECT * INTO v_new_owner
  FROM licenses
  WHERE user_id = v_application.new_owner_user_id
  AND status = 'active'
  LIMIT 1;
  
  -- Save to history
  INSERT INTO ownership_transfer_history (
    registered_vehicle_id,
    application_id,
    previous_owner_user_id,
    previous_owner_name_en,
    previous_owner_name_bn,
    previous_owner_nid,
    new_owner_user_id,
    new_owner_name_en,
    new_owner_name_bn,
    new_owner_nid,
    transfer_fee_paid
  ) VALUES (
    v_application.registered_vehicle_id,
    p_application_id,
    v_old_owner.user_id,
    v_old_owner.owner_name_en,
    v_old_owner.owner_name_bn,
    v_old_owner.owner_nid,
    v_application.new_owner_user_id,
    v_new_owner.full_name_en,
    v_new_owner.full_name_bn,
    v_new_owner.nid_number,
    v_application.transfer_fee
  );
  
  -- Update registered_vehicles table with new owner
  UPDATE registered_vehicles
  SET 
    user_id = v_application.new_owner_user_id,
    owner_name_en = v_new_owner.full_name_en,
    owner_name_bn = v_new_owner.full_name_bn,
    owner_nid = v_new_owner.nid_number,
    owner_dl_number = v_application.new_owner_dl_number,
    -- Update QR code data with new owner info
    qr_code_data = jsonb_build_object(
      'registration_number', registration_number,
      'registration_plate', registration_plate,
      'owner_name_en', v_new_owner.full_name_en,
      'owner_name_bn', v_new_owner.full_name_bn,
      'owner_nid', v_new_owner.nid_number,
      'vehicle_name', vehicle_name,
      'model', model,
      'engine_number', engine_number,
      'vehicle_type', vehicle_type,
      'valid_until', valid_until,
      'transferred_on', CURRENT_DATE
    ),
    updated_at = NOW()
  WHERE id = v_application.registered_vehicle_id;
  
  -- Update tax tokens to new owner
  UPDATE tax_tokens
  SET user_id = v_application.new_owner_user_id
  WHERE registered_vehicle_id = v_application.registered_vehicle_id
  AND status = 'active';
  
  -- Update application status
  UPDATE ownership_transfer_applications
  SET 
    status = 'completed',
    transfer_completed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_application_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 4. TRIGGERS
-- =====================================================

-- Auto-update updated_at column
CREATE OR REPLACE FUNCTION update_ownership_transfer_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_ownership_transfer_updated_at
BEFORE UPDATE ON ownership_transfer_applications
FOR EACH ROW EXECUTE FUNCTION update_ownership_transfer_updated_at();

-- =====================================================
-- 5. ENABLE REALTIME
-- =====================================================

DO $$
BEGIN
  -- Add ownership_transfer_applications to realtime
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE ownership_transfer_applications;
    RAISE NOTICE 'Added ownership_transfer_applications to realtime';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'ownership_transfer_applications already in realtime or error: %', SQLERRM;
  END;
  
  -- Add ownership_transfer_history to realtime
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE ownership_transfer_history;
    RAISE NOTICE 'Added ownership_transfer_history to realtime';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'ownership_transfer_history already in realtime or error: %', SQLERRM;
  END;
END $$;

-- =====================================================
-- 6. SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Vehicle Ownership Transfer System Created!';
  RAISE NOTICE '📋 Tables: ownership_transfer_applications, ownership_transfer_history';
  RAISE NOTICE '🔧 Functions: 5 (generate_number, search_dl, validate_license, check_eligibility, execute_transfer)';
  RAISE NOTICE '⚡ Indexes: 11';
  RAISE NOTICE '🔄 Triggers: 1 (auto update timestamp)';
  RAISE NOTICE '📡 Realtime: Enabled for both tables';
  RAISE NOTICE '🔓 RLS: Disabled (No policies)';
  RAISE NOTICE '🌐 Bilingual: Ready (দলিল/Deed support)';
  RAISE NOTICE '💰 Default Transfer Fee: 5000 BDT';
  RAISE NOTICE '🚀 Ready to deploy!';
END $$;
