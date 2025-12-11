-- Update Ownership Transfer Eligibility Check to Include Impoundment Status
-- Execute this in Supabase SQL Editor

DROP FUNCTION IF EXISTS check_vehicle_transfer_eligibility(UUID);

CREATE OR REPLACE FUNCTION check_vehicle_transfer_eligibility(p_vehicle_id UUID)
RETURNS TABLE (
  is_eligible BOOLEAN,
  smart_card_valid BOOLEAN,
  tax_token_valid BOOLEAN,
  has_unpaid_fines BOOLEAN,
  has_impoundment BOOLEAN,
  error_message TEXT
) AS $$
DECLARE
  v_smart_card_valid BOOLEAN;
  v_tax_token_valid BOOLEAN;
  v_has_unpaid_fines BOOLEAN;
  v_has_impoundment BOOLEAN;
  v_unpaid_fine_count INTEGER;
  v_impoundment_count INTEGER;
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
  
  -- Check 4: Vehicle Impoundment
  SELECT COUNT(*) INTO v_impoundment_count
  FROM vehicle_impoundments
  WHERE registered_vehicle_id = p_vehicle_id
  AND status = 'impounded'
  AND payment_status = 'unpaid';
  
  v_has_impoundment := (v_impoundment_count > 0);
  
  IF v_has_impoundment THEN
    v_error_msg := v_error_msg || 'Vehicle is impounded. ';
  END IF;
  
  -- Return results
  RETURN QUERY SELECT 
    (v_smart_card_valid AND v_tax_token_valid AND NOT v_has_unpaid_fines AND NOT v_has_impoundment),
    v_smart_card_valid,
    v_tax_token_valid,
    v_has_unpaid_fines,
    v_has_impoundment,
    CASE 
      WHEN v_error_msg = '' THEN 'Eligible for transfer'
      ELSE TRIM(v_error_msg)
    END;
END;
$$ LANGUAGE plpgsql;

-- Verify the update
SELECT * FROM check_vehicle_transfer_eligibility('00000000-0000-0000-0000-000000000000'::UUID);
