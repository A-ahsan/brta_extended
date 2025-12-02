-- Fix: Update the process_tax_token_renewal function to match your table structure
-- Your table has 'previous_expiry_date' but the function uses 'old_expiry_date'

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
  -- If expired, start from today, otherwise extend from current expiry
  IF v_old_expiry < CURRENT_DATE THEN
    v_new_expiry := CURRENT_DATE + (p_renewal_days || ' days')::INTERVAL;
  ELSE
    v_new_expiry := v_old_expiry + (p_renewal_days || ' days')::INTERVAL;
  END IF;

  -- Generate renewal number
  v_renewal_number := generate_tax_renewal_number();

  -- Create renewal record (using column names that exist in your table)
  INSERT INTO tax_token_renewals (
    vehicle_id,
    user_id,
    payment_id,
    renewal_number,
    renewal_days,
    amount_paid,
    previous_expiry_date,  -- Changed from old_expiry_date
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

SELECT 'Function updated successfully! Now try the payment again.' AS status;
