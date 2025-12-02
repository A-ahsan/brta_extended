-- Tax Token Renewal System
-- Complete schema for vehicle tax token renewal feature

-- 1. Create tax_token_renewals table to track renewal history
CREATE TABLE IF NOT EXISTS tax_token_renewals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID REFERENCES registered_vehicles(id) ON DELETE CASCADE,
  tax_token_id UUID REFERENCES tax_tokens(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Renewal Details
  renewal_number VARCHAR(30) UNIQUE NOT NULL,
  renewal_days INTEGER NOT NULL CHECK (renewal_days > 0 AND renewal_days <= 730),
  previous_expiry_date DATE NOT NULL,
  new_issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  new_expiry_date DATE NOT NULL,
  
  -- Payment Information
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  amount_paid NUMERIC(10, 2) NOT NULL,
  
  -- Status
  status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('completed', 'cancelled', 'refunded')) NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add renewal tracking columns to tax_tokens table (if not exist)
ALTER TABLE tax_tokens ADD COLUMN IF NOT EXISTS renewal_count INTEGER DEFAULT 0;
ALTER TABLE tax_tokens ADD COLUMN IF NOT EXISTS last_renewed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE tax_tokens ADD COLUMN IF NOT EXISTS original_issue_date DATE;

-- Update existing tax tokens to set original_issue_date
UPDATE tax_tokens SET original_issue_date = issue_date WHERE original_issue_date IS NULL;

-- 3. Add renewal tracking columns to registered_vehicles table (if not exist)
ALTER TABLE registered_vehicles ADD COLUMN IF NOT EXISTS last_renewed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE registered_vehicles ADD COLUMN IF NOT EXISTS original_registration_date DATE;

-- Update existing vehicles to set original_registration_date
UPDATE registered_vehicles SET original_registration_date = registration_date WHERE original_registration_date IS NULL;

-- 4. Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tax_token_renewals_vehicle_id ON tax_token_renewals(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_tax_token_renewals_user_id ON tax_token_renewals(user_id);
CREATE INDEX IF NOT EXISTS idx_tax_token_renewals_token_id ON tax_token_renewals(tax_token_id);
CREATE INDEX IF NOT EXISTS idx_tax_token_renewals_payment_id ON tax_token_renewals(payment_id);
CREATE INDEX IF NOT EXISTS idx_tax_token_renewals_renewal_number ON tax_token_renewals(renewal_number);
CREATE INDEX IF NOT EXISTS idx_tax_token_renewals_status ON tax_token_renewals(status);

-- 5. Generate unique renewal number function
CREATE OR REPLACE FUNCTION generate_tax_renewal_number()
RETURNS TEXT AS $$
DECLARE
  year_part TEXT;
  random_part TEXT;
BEGIN
  year_part := TO_CHAR(NOW(), 'YY');
  random_part := LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');
  RETURN 'TTREN' || year_part || random_part;
END;
$$ LANGUAGE plpgsql;

-- 6. Function to process tax token renewal
CREATE OR REPLACE FUNCTION process_tax_token_renewal(
  p_vehicle_id UUID,
  p_user_id UUID,
  p_payment_id UUID,
  p_renewal_days INTEGER,
  p_amount_paid NUMERIC
)
RETURNS JSON AS $$
DECLARE
  v_vehicle RECORD;
  v_tax_token RECORD;
  v_renewal_number TEXT;
  v_new_expiry_date DATE;
  v_previous_expiry DATE;
  v_renewal_id UUID;
BEGIN
  -- Get vehicle details
  SELECT * INTO v_vehicle 
  FROM registered_vehicles 
  WHERE id = p_vehicle_id AND user_id = p_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Vehicle not found';
  END IF;

  -- Get or create tax token
  SELECT * INTO v_tax_token 
  FROM tax_tokens 
  WHERE registered_vehicle_id = p_vehicle_id 
  ORDER BY created_at DESC 
  LIMIT 1;
  
  -- Store previous expiry date
  IF v_tax_token IS NOT NULL THEN
    v_previous_expiry := v_tax_token.valid_until;
  ELSE
    v_previous_expiry := v_vehicle.valid_until;
  END IF;
  
  -- Calculate new expiry date (from today + renewal days)
  v_new_expiry_date := CURRENT_DATE + (p_renewal_days || ' days')::INTERVAL;
  
  -- Generate renewal number
  v_renewal_number := generate_tax_renewal_number();
  
  -- Create renewal record
  INSERT INTO tax_token_renewals (
    vehicle_id,
    tax_token_id,
    user_id,
    renewal_number,
    renewal_days,
    previous_expiry_date,
    new_issue_date,
    new_expiry_date,
    payment_id,
    amount_paid,
    status
  ) VALUES (
    p_vehicle_id,
    v_tax_token.id,
    p_user_id,
    v_renewal_number,
    p_renewal_days,
    v_previous_expiry,
    CURRENT_DATE,
    v_new_expiry_date,
    p_payment_id,
    p_amount_paid,
    'completed'
  ) RETURNING id INTO v_renewal_id;
  
  -- Update tax token if exists, otherwise create new
  IF v_tax_token IS NOT NULL THEN
    UPDATE tax_tokens
    SET 
      issue_date = CURRENT_DATE,
      valid_until = v_new_expiry_date,
      status = 'active',
      renewal_count = COALESCE(renewal_count, 0) + 1,
      last_renewed_at = NOW(),
      updated_at = NOW()
    WHERE id = v_tax_token.id;
  ELSE
    -- Create new tax token
    INSERT INTO tax_tokens (
      token_number,
      registered_vehicle_id,
      user_id,
      issue_date,
      valid_until,
      tax_year,
      amount_paid,
      status,
      renewal_count
    ) VALUES (
      'TT-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0'),
      p_vehicle_id,
      p_user_id,
      CURRENT_DATE,
      v_new_expiry_date,
      TO_CHAR(NOW(), 'YYYY'),
      p_amount_paid,
      'active',
      1
    );
  END IF;
  
  -- Update vehicle registration dates
  UPDATE registered_vehicles
  SET 
    valid_until = v_new_expiry_date,
    last_renewed_at = NOW(),
    status = 'active',
    updated_at = NOW()
  WHERE id = p_vehicle_id;
  
  -- Return renewal details
  RETURN json_build_object(
    'renewal_id', v_renewal_id,
    'renewal_number', v_renewal_number,
    'vehicle_id', p_vehicle_id,
    'registration_number', v_vehicle.registration_number,
    'new_issue_date', CURRENT_DATE,
    'new_expiry_date', v_new_expiry_date,
    'renewal_days', p_renewal_days,
    'amount_paid', p_amount_paid
  );
END;
$$ LANGUAGE plpgsql;

-- 7. Updated at trigger for tax_token_renewals
CREATE OR REPLACE FUNCTION update_tax_token_renewals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_tax_token_renewals_updated_at
BEFORE UPDATE ON tax_token_renewals
FOR EACH ROW EXECUTE FUNCTION update_tax_token_renewals_updated_at();

-- 8. RLS Policies for tax_token_renewals

ALTER TABLE tax_token_renewals ENABLE ROW LEVEL SECURITY;

-- Users can view their own renewals
CREATE POLICY "Users can view own tax token renewals"
ON tax_token_renewals FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own renewals (via function)
CREATE POLICY "Users can create own tax token renewals"
ON tax_token_renewals FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can view all renewals
CREATE POLICY "Admins can view all tax token renewals"
ON tax_token_renewals FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Police can view all renewals
CREATE POLICY "Police can view all tax token renewals"
ON tax_token_renewals FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'police'
  )
);

-- 9. Update payment_type constraint to include tax_token_renewal
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_payment_type_check;
ALTER TABLE payments ADD CONSTRAINT payments_payment_type_check 
  CHECK (payment_type IN ('application', 'renewal', 'vehicle_registration', 'tax_token_renewal'));

-- 10. Add vehicle_id column to payments table if not exists
ALTER TABLE payments ADD COLUMN IF NOT EXISTS vehicle_id UUID REFERENCES registered_vehicles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_payments_vehicle_id ON payments(vehicle_id);

-- Complete!
-- Run this script in your Supabase SQL editor to set up the tax token renewal system
