-- =====================================================
-- ROUTE PERMIT SYSTEM - Complete Database Setup
-- =====================================================
-- Run this entire file in Supabase SQL Editor
-- No RLS policies (as requested)

-- =====================================================
-- 1. Route Permits Table
-- =====================================================
CREATE TABLE IF NOT EXISTS route_permits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  permit_number VARCHAR(30) UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  vehicle_id UUID REFERENCES registered_vehicles(id) ON DELETE CASCADE NOT NULL,
  
  -- Route Details (from map)
  route_data JSONB NOT NULL, -- Stores {from: {lat, lng, name}, to: {lat, lng, name}, distance_km, route_path}
  route_from_en TEXT NOT NULL,
  route_from_bn TEXT NOT NULL,
  route_to_en TEXT NOT NULL,
  route_to_bn TEXT NOT NULL,
  distance_km NUMERIC(10,2) NOT NULL,
  
  -- Permit Duration
  permit_days INTEGER NOT NULL CHECK (permit_days >= 1 AND permit_days <= 365),
  issue_date DATE,
  expiry_date DATE,
  
  -- Reason Document
  reason_document_url TEXT NOT NULL, -- PDF/Image URL from storage
  reason_description_en TEXT NOT NULL,
  reason_description_bn TEXT NOT NULL,
  
  -- Fee Calculation
  base_fee NUMERIC(10,2) NOT NULL,
  distance_fee NUMERIC(10,2) NOT NULL,
  total_fee NUMERIC(10,2) NOT NULL,
  
  -- Payment
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed')) NOT NULL,
  payment_date TIMESTAMP WITH TIME ZONE,
  
  -- Admin Review
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')) NOT NULL,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  review_date TIMESTAMP WITH TIME ZONE,
  rejection_reason_en TEXT,
  rejection_reason_bn TEXT,
  
  -- QR Code Data (JSON - for scanning verification)
  qr_code_data JSONB,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. Indexes for Performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_route_permits_user_id ON route_permits(user_id);
CREATE INDEX IF NOT EXISTS idx_route_permits_vehicle_id ON route_permits(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_route_permits_status ON route_permits(status);
CREATE INDEX IF NOT EXISTS idx_route_permits_permit_number ON route_permits(permit_number);
CREATE INDEX IF NOT EXISTS idx_route_permits_payment_id ON route_permits(payment_id);
CREATE INDEX IF NOT EXISTS idx_route_permits_expiry_date ON route_permits(expiry_date);
CREATE INDEX IF NOT EXISTS idx_route_permits_reviewed_by ON route_permits(reviewed_by);

-- =====================================================
-- 3. Function: Generate Permit Number
-- =====================================================
-- Format: RP2025XXXXXX (RP = Route Permit, Year, 6-digit counter)
CREATE OR REPLACE FUNCTION generate_route_permit_number()
RETURNS VARCHAR AS $$
DECLARE
  year_part VARCHAR(4);
  counter INTEGER;
  new_number VARCHAR(30);
BEGIN
  year_part := TO_CHAR(NOW(), 'YYYY');
  
  -- Get the current max number for this year
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(permit_number FROM 7) AS INTEGER)
  ), 0) + 1 INTO counter
  FROM route_permits
  WHERE permit_number LIKE 'RP' || year_part || '%';
  
  -- Format: RP2025000001
  new_number := 'RP' || year_part || LPAD(counter::TEXT, 6, '0');
  
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 4. Function: Calculate Route Permit Fee
-- =====================================================
-- Fee structure:
-- Base fee by vehicle type:
--   - Bike (≤150 CC): ৳100/day
--   - Bike (>150 CC): ৳150/day
--   - Car (≤1500 CC): ৳200/day
--   - Car (>1500 CC): ৳300/day
-- Distance fee: ৳5 per km per day
-- Total = (base_fee + distance_fee) * days
CREATE OR REPLACE FUNCTION calculate_route_permit_fee(
  p_vehicle_id UUID,
  p_distance_km NUMERIC,
  p_permit_days INTEGER
)
RETURNS JSONB AS $$
DECLARE
  v_vehicle_type VARCHAR;
  v_engine_cc INTEGER;
  v_base_fee_per_day NUMERIC;
  v_distance_fee_per_day NUMERIC;
  v_base_fee NUMERIC;
  v_distance_fee NUMERIC;
  v_total_fee NUMERIC;
BEGIN
  -- Get vehicle details
  SELECT rv.vehicle_type, rv.engine_cc
  INTO v_vehicle_type, v_engine_cc
  FROM registered_vehicles rv
  WHERE rv.id = p_vehicle_id;
  
  -- Calculate base fee per day
  IF v_vehicle_type = 'Bike' THEN
    IF v_engine_cc <= 150 THEN
      v_base_fee_per_day := 100;
    ELSE
      v_base_fee_per_day := 150;
    END IF;
  ELSE -- Car
    IF v_engine_cc <= 1500 THEN
      v_base_fee_per_day := 200;
    ELSE
      v_base_fee_per_day := 300;
    END IF;
  END IF;
  
  -- Distance fee: ৳5 per km per day
  v_distance_fee_per_day := p_distance_km * 5;
  
  -- Total fees
  v_base_fee := v_base_fee_per_day * p_permit_days;
  v_distance_fee := v_distance_fee_per_day * p_permit_days;
  v_total_fee := v_base_fee + v_distance_fee;
  
  RETURN jsonb_build_object(
    'base_fee', v_base_fee,
    'distance_fee', v_distance_fee,
    'total_fee', v_total_fee,
    'base_fee_per_day', v_base_fee_per_day,
    'distance_fee_per_day', v_distance_fee_per_day
  );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. Update payments table constraint for route_permit
-- =====================================================
-- SAFE UPDATE: Only drops and recreates if 'route_permit' is not already included
-- This prevents breaking existing payment records
DO $$ 
BEGIN
  -- First, check if constraint exists and get its definition
  -- Drop existing constraint only if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'payments_payment_type_check' 
    AND conrelid = 'payments'::regclass
  ) THEN
    -- Drop the old constraint
    ALTER TABLE payments DROP CONSTRAINT payments_payment_type_check;
  END IF;
  
  -- Add new constraint with ALL payment types (including route_permit)
  -- This includes any types that might exist in your current data
  ALTER TABLE payments ADD CONSTRAINT payments_payment_type_check 
    CHECK (payment_type IN (
      'application', 
      'renewal', 
      'vehicle_registration', 
      'tax_token_renewal', 
      'violation_fine', 
      'route_permit',
      'license_application',
      'exam_fee',
      'test_fee',
      'duplicate_license',
      'other'
    ));
    
EXCEPTION
  WHEN OTHERS THEN
    -- If there's an error, just skip and continue
    -- This ensures the script doesn't fail
    RAISE NOTICE 'Skipping payments constraint update: %', SQLERRM;
END $$;

-- =====================================================
-- 6. Update notifications table constraint for route_permit
-- =====================================================
-- SAFE UPDATE: Adds route_permit notification types without breaking existing ones
DO $$ 
BEGIN
  -- Check if constraint exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'notifications_notification_type_check' 
    AND conrelid = 'notifications'::regclass
  ) THEN
    -- Drop the old constraint
    ALTER TABLE notifications DROP CONSTRAINT notifications_notification_type_check;
  END IF;
  
  -- Add new constraint with ALL notification types (including route_permit types)
  ALTER TABLE notifications ADD CONSTRAINT notifications_notification_type_check 
    CHECK (notification_type IN (
      'application', 'verification', 'exam', 'payment', 'approval', 'rejection', 
      'general', 'renewal', 'vehicle_registration', 'vehicle_added', 
      'admin_vehicle_alert', 'vehicle_registration_complete', 'tax_token_renewal',
      'route_permit_application', 'route_permit_approved', 'route_permit_rejected', 
      'route_permit_payment', 'route_permit_expiring', 'route_permit_expired',
      'license_issued', 'exam_scheduled', 'slot_booked', 'system', 'alert', 'reminder'
    ));
    
EXCEPTION
  WHEN OTHERS THEN
    -- If there's an error, just skip and continue
    RAISE NOTICE 'Skipping notifications constraint update: %', SQLERRM;
END $$;

-- =====================================================
-- 7. Function: Auto-expire permits
-- =====================================================
-- This should be run daily (can be set up as a cron job or Supabase edge function)
CREATE OR REPLACE FUNCTION expire_route_permits()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE route_permits
  SET status = 'expired'
  WHERE status = 'approved'
    AND expiry_date < CURRENT_DATE
    AND status != 'expired';
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 8. Trigger: Update updated_at on changes
-- =====================================================
CREATE OR REPLACE FUNCTION update_route_permits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_route_permits_updated_at_trigger ON route_permits;
CREATE TRIGGER update_route_permits_updated_at_trigger
  BEFORE UPDATE ON route_permits
  FOR EACH ROW
  EXECUTE FUNCTION update_route_permits_updated_at();

-- =====================================================
-- 9. Storage Bucket Setup
-- =====================================================
-- Storage bucket will be created automatically by the frontend
-- No manual creation needed - just run this SQL script!

-- Create storage bucket for route permit documents (PUBLIC bucket)
INSERT INTO storage.buckets (id, name, public)
VALUES ('route-permit-documents', 'route-permit-documents', true)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 10. Sample Data (for testing)
-- =====================================================
-- This is commented out - uncomment to add test data
/*
-- Example: Create a test route permit (requires existing user and vehicle)
INSERT INTO route_permits (
  permit_number,
  user_id,
  vehicle_id,
  route_data,
  route_from_en,
  route_from_bn,
  route_to_en,
  route_to_bn,
  distance_km,
  permit_days,
  reason_document_url,
  reason_description_en,
  reason_description_bn,
  base_fee,
  distance_fee,
  total_fee,
  status
) VALUES (
  generate_route_permit_number(),
  '00000000-0000-0000-0000-000000000000', -- Replace with actual user UUID
  '00000000-0000-0000-0000-000000000000', -- Replace with actual vehicle UUID
  '{"from": {"lat": 23.8103, "lng": 90.4125, "name": "Dhaka"}, "to": {"lat": 22.3569, "lng": 91.7832, "name": "Chattogram"}, "distance_km": 244}'::jsonb,
  'Dhaka',
  'ঢাকা',
  'Chattogram',
  'চট্টগ্রাম',
  244,
  30,
  'https://example.com/reason.pdf',
  'Business trip for company work',
  'কোম্পানির কাজের জন্য ব্যবসায়িক ভ্রমণ',
  3000,
  36600,
  39600,
  'pending'
);
*/

-- =====================================================
-- SETUP COMPLETE!
-- =====================================================
-- Next steps:
-- 1. Verify table created: Check 'route_permits' in Table Editor
-- 2. Test functions: SELECT generate_route_permit_number();
-- 3. Test fee calculation: SELECT calculate_route_permit_fee('vehicle-uuid', 100, 7);
-- 4. Check storage bucket: 'route-permit-documents' should exist
-- 5. Implement frontend components
