-- SAFE: Fix tax token renewal system (Only adds missing columns, no existing data affected)
-- Run this in Supabase SQL Editor

-- STEP 1: Add missing columns to payments table (SAFE - only if not exists)
DO $$ 
BEGIN
  -- Add vehicle_id column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='payments' AND column_name='vehicle_id') THEN
    ALTER TABLE payments ADD COLUMN vehicle_id UUID REFERENCES registered_vehicles(id) ON DELETE CASCADE;
  END IF;

  -- Add payment_type column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='payments' AND column_name='payment_type') THEN
    ALTER TABLE payments ADD COLUMN payment_type VARCHAR(30) DEFAULT 'license_application';
  END IF;

  -- Add renewal_days column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='payments' AND column_name='renewal_days') THEN
    ALTER TABLE payments ADD COLUMN renewal_days INTEGER;
  END IF;

  -- Add metadata column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='payments' AND column_name='metadata') THEN
    ALTER TABLE payments ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- STEP 2: Update payment_type constraint (SAFE - drops and recreates)
DO $$ 
BEGIN
  ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_payment_type_check;
  ALTER TABLE payments ADD CONSTRAINT payments_payment_type_check 
    CHECK (payment_type IN ('license_application', 'license_renewal', 'tax_token_renewal'));
EXCEPTION
  WHEN others THEN NULL;
END $$;

-- STEP 3: Create indexes (SAFE - IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_payments_vehicle_id ON payments(vehicle_id);

-- STEP 4: Create tax_token_renewals table (SAFE - IF NOT EXISTS)
CREATE TABLE IF NOT EXISTS tax_token_renewals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID REFERENCES registered_vehicles(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  payment_id UUID REFERENCES payments(id) ON DELETE CASCADE NOT NULL,
  renewal_number VARCHAR(20) UNIQUE NOT NULL,
  renewal_days INTEGER NOT NULL,
  amount_paid NUMERIC(10,2) NOT NULL,
  old_expiry_date DATE NOT NULL,
  new_expiry_date DATE NOT NULL,
  status VARCHAR(20) CHECK (status IN ('active', 'cancelled')) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- STEP 5: Create indexes (SAFE - IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_tax_token_renewals_vehicle_id ON tax_token_renewals(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_tax_token_renewals_user_id ON tax_token_renewals(user_id);
CREATE INDEX IF NOT EXISTS idx_tax_token_renewals_payment_id ON tax_token_renewals(payment_id);

-- STEP 6: Create/Update renewal number function (SAFE - CREATE OR REPLACE)
CREATE OR REPLACE FUNCTION generate_tax_renewal_number()
RETURNS TEXT AS $$
DECLARE
  new_number TEXT;
  counter INTEGER;
BEGIN
  counter := (SELECT COUNT(*) FROM tax_token_renewals) + 1;
  new_number := 'TRN-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(counter::TEXT, 6, '0');
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- STEP 7: Drop old function first, then create new one (SAFE - prevents signature conflict)
DROP FUNCTION IF EXISTS process_tax_token_renewal(UUID, UUID, UUID, INTEGER, NUMERIC);

-- Create the function with new signature
CREATE FUNCTION process_tax_token_renewal(
  p_vehicle_id UUID,
  p_user_id UUID,
  p_payment_id UUID,
  p_renewal_days INTEGER,
  p_amount_paid NUMERIC
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  new_expiry_date DATE,
  renewal_id UUID
) AS $$
DECLARE
  v_old_expiry DATE;
  v_new_expiry DATE;
  v_renewal_number TEXT;
  v_renewal_id UUID;
BEGIN
  -- Get current expiry date from vehicle
  SELECT valid_until INTO v_old_expiry
  FROM registered_vehicles
  WHERE id = p_vehicle_id AND user_id = p_user_id;

  IF v_old_expiry IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Vehicle not found'::TEXT, NULL::DATE, NULL::UUID;
    RETURN;
  END IF;

  -- Calculate new expiry date
  -- If expired, start from today, otherwise extend from current expiry
  IF v_old_expiry < CURRENT_DATE THEN
    v_new_expiry := CURRENT_DATE + (p_renewal_days || ' days')::INTERVAL;
  ELSE
    v_new_expiry := v_old_expiry + (p_renewal_days || ' days')::INTERVAL;
  END IF;

  -- Generate renewal number
  v_renewal_number := generate_tax_renewal_number();

  -- Create renewal record
  INSERT INTO tax_token_renewals (
    vehicle_id,
    user_id,
    payment_id,
    renewal_number,
    renewal_days,
    amount_paid,
    old_expiry_date,
    new_expiry_date,
    status
  ) VALUES (
    p_vehicle_id,
    p_user_id,
    p_payment_id,
    v_renewal_number,
    p_renewal_days,
    p_amount_paid,
    v_old_expiry,
    v_new_expiry,
    'active'
  ) RETURNING id INTO v_renewal_id;

  -- Update vehicle expiry date and status
  UPDATE registered_vehicles
  SET 
    valid_until = v_new_expiry,
    status = 'active',
    updated_at = NOW()
  WHERE id = p_vehicle_id;

  -- Update tax token expiry date and status
  UPDATE tax_tokens
  SET 
    valid_until = v_new_expiry,
    status = 'active',
    updated_at = NOW()
  WHERE registered_vehicle_id = p_vehicle_id;

  -- Return success
  RETURN QUERY SELECT TRUE, 'Tax token renewed successfully'::TEXT, v_new_expiry, v_renewal_id;
END;
$$ LANGUAGE plpgsql;

-- STEP 8: Enable RLS (SAFE - idempotent)
ALTER TABLE tax_token_renewals ENABLE ROW LEVEL SECURITY;

-- STEP 9: Create RLS policies (SAFE - DROP IF EXISTS first)
DROP POLICY IF EXISTS "Users can view their own tax token renewals" ON tax_token_renewals;
CREATE POLICY "Users can view their own tax token renewals"
ON tax_token_renewals FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage tax token renewals" ON tax_token_renewals;
CREATE POLICY "Service role can manage tax token renewals"
ON tax_token_renewals FOR ALL
USING (true);

-- STEP 10: Verification
SELECT 
  'Tax token renewal system setup complete!' AS status,
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='payments' AND column_name='renewal_days') AS renewal_days_exists,
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='tax_token_renewals') AS renewals_table_exists,
  EXISTS(SELECT 1 FROM pg_proc WHERE proname='process_tax_token_renewal') AS function_exists;
