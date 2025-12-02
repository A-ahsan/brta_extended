-- Complete fix: Drop and recreate tax_token_renewals table with correct structure
-- This ensures we have exactly the columns we need, no more, no less

-- Step 1: Drop the table completely
DROP TABLE IF EXISTS tax_token_renewals CASCADE;

-- Step 2: Recreate with clean structure
CREATE TABLE tax_token_renewals (
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

-- Step 3: Create indexes
CREATE INDEX idx_tax_token_renewals_vehicle_id ON tax_token_renewals(vehicle_id);
CREATE INDEX idx_tax_token_renewals_user_id ON tax_token_renewals(user_id);
CREATE INDEX idx_tax_token_renewals_payment_id ON tax_token_renewals(payment_id);

-- Step 4: Enable RLS
ALTER TABLE tax_token_renewals ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policies
CREATE POLICY "Users can view their own tax token renewals"
ON tax_token_renewals FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage tax token renewals"
ON tax_token_renewals FOR ALL
USING (true);

-- Step 6: Recreate the function with correct column names
DROP FUNCTION IF EXISTS process_tax_token_renewal(UUID, UUID, UUID, INTEGER, NUMERIC);

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

-- Step 7: Verify everything
SELECT 
  'Setup complete!' AS status,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name='tax_token_renewals') AS column_count,
  (SELECT COUNT(*) FROM pg_proc WHERE proname='process_tax_token_renewal') AS function_exists;

-- Show table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'tax_token_renewals'
ORDER BY ordinal_position;
