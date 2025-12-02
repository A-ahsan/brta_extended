-- COMPREHENSIVE FIX: Tax Token Renewal System
-- This script will work with your existing database structure
-- Safe for production - will not break existing systems

-- Step 1: Check and add missing columns to tax_tokens if needed
DO $$ 
BEGIN
  -- Add updated_at column to tax_tokens if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='tax_tokens' AND column_name='updated_at'
  ) THEN
    ALTER TABLE tax_tokens ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    RAISE NOTICE 'Added updated_at column to tax_tokens table';
  END IF;

  -- Add updated_at column to registered_vehicles if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='registered_vehicles' AND column_name='updated_at'
  ) THEN
    ALTER TABLE registered_vehicles ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    RAISE NOTICE 'Added updated_at column to registered_vehicles table';
  END IF;
END $$;

-- Step 2: Drop and recreate tax_token_renewals table
DROP TABLE IF EXISTS tax_token_renewals CASCADE;

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
CREATE INDEX IF NOT EXISTS idx_tax_token_renewals_vehicle_id ON tax_token_renewals(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_tax_token_renewals_user_id ON tax_token_renewals(user_id);
CREATE INDEX IF NOT EXISTS idx_tax_token_renewals_payment_id ON tax_token_renewals(payment_id);

-- Step 4: Enable RLS
ALTER TABLE tax_token_renewals ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policies
DROP POLICY IF EXISTS "Users can view their own tax token renewals" ON tax_token_renewals;
CREATE POLICY "Users can view their own tax token renewals"
ON tax_token_renewals FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage tax token renewals" ON tax_token_renewals;
CREATE POLICY "Service role can manage tax token renewals"
ON tax_token_renewals FOR ALL
USING (true);

-- Step 6: Recreate the renewal function (SAFE - works with or without updated_at)
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
  v_has_updated_at_vehicles BOOLEAN;
  v_has_updated_at_tokens BOOLEAN;
BEGIN
  -- Check if tables have updated_at column
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='registered_vehicles' AND column_name='updated_at'
  ) INTO v_has_updated_at_vehicles;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='tax_tokens' AND column_name='updated_at'
  ) INTO v_has_updated_at_tokens;

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

  -- Update vehicle expiry date and status (with or without updated_at)
  IF v_has_updated_at_vehicles THEN
    UPDATE registered_vehicles
    SET 
      valid_until = v_new_expiry,
      status = 'active',
      updated_at = NOW()
    WHERE id = p_vehicle_id;
  ELSE
    UPDATE registered_vehicles
    SET 
      valid_until = v_new_expiry,
      status = 'active'
    WHERE id = p_vehicle_id;
  END IF;

  -- Update tax token expiry date and status (with or without updated_at)
  IF v_has_updated_at_tokens THEN
    UPDATE tax_tokens
    SET 
      valid_until = v_new_expiry,
      status = 'active',
      updated_at = NOW()
    WHERE registered_vehicle_id = p_vehicle_id;
  ELSE
    UPDATE tax_tokens
    SET 
      valid_until = v_new_expiry,
      status = 'active'
    WHERE registered_vehicle_id = p_vehicle_id;
  END IF;

  -- Return success
  RETURN QUERY SELECT TRUE, 'Tax token renewed successfully'::TEXT, v_new_expiry, v_renewal_id;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Verify setup
SELECT 
  'Tax Token Renewal System Setup Complete!' AS status,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name='tax_token_renewals') AS renewals_table_columns,
  (SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='tax_tokens' AND column_name='updated_at')) AS tax_tokens_has_updated_at,
  (SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='registered_vehicles' AND column_name='updated_at')) AS vehicles_has_updated_at,
  (SELECT EXISTS(SELECT 1 FROM pg_proc WHERE proname='process_tax_token_renewal')) AS function_exists;

-- Show final table structure
SELECT 
  table_name,
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name IN ('tax_token_renewals', 'tax_tokens', 'registered_vehicles')
  AND column_name IN ('updated_at', 'old_expiry_date', 'new_expiry_date', 'valid_until', 'status')
ORDER BY table_name, ordinal_position;
