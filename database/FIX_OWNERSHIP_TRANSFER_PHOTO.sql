-- =====================================================
-- FIX OWNERSHIP TRANSFER - ADD PHOTO UPDATE
-- =====================================================
-- This updates the execute_ownership_transfer function to include new owner's photo

-- Drop existing function first
DROP FUNCTION IF EXISTS execute_ownership_transfer(UUID);

-- Recreate with photo update
CREATE OR REPLACE FUNCTION execute_ownership_transfer(p_application_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_application RECORD;
  v_new_owner RECORD;
  v_current_owner RECORD;
  v_result JSONB;
BEGIN
  -- Get application details
  SELECT * INTO v_application
  FROM ownership_transfer_applications
  WHERE id = p_application_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Application not found');
  END IF;

  -- Verify application is approved and payment completed
  IF (v_application.status NOT IN ('approved', 'payment_completed')) OR v_application.payment_status != 'completed' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Application not ready for transfer');
  END IF;

  -- Get current owner details from registered_vehicles
  SELECT 
    owner_name_en,
    owner_name_bn,
    owner_nid
  INTO v_current_owner
  FROM registered_vehicles
  WHERE id = v_application.registered_vehicle_id
  LIMIT 1;

  -- Get new owner details from licenses
  SELECT 
    full_name_en,
    full_name_bn,
    nid_number,
    photo_url
  INTO v_new_owner
  FROM licenses
  WHERE license_number = v_application.new_owner_dl_number
  AND status = 'active'
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'New owner license not found');
  END IF;

  -- Save to history
  INSERT INTO ownership_transfer_history (
    application_id,
    registered_vehicle_id,
    previous_owner_user_id,
    previous_owner_name_en,
    previous_owner_name_bn,
    previous_owner_nid,
    new_owner_user_id,
    new_owner_name_en,
    new_owner_name_bn,
    new_owner_nid,
    transfer_fee_paid
  )
  VALUES (
    v_application.id,
    v_application.registered_vehicle_id,
    v_application.current_owner_user_id,
    v_current_owner.owner_name_en,
    v_current_owner.owner_name_bn,
    v_current_owner.owner_nid,
    v_application.new_owner_user_id,
    v_application.new_owner_name_en,
    v_application.new_owner_name_bn,
    v_new_owner.nid_number,
    v_application.transfer_fee
  );
  
  -- Update registered_vehicles table with new owner (INCLUDING PHOTO!)
  UPDATE registered_vehicles
  SET 
    user_id = v_application.new_owner_user_id,
    owner_name_en = v_new_owner.full_name_en,
    owner_name_bn = v_new_owner.full_name_bn,
    owner_nid = v_new_owner.nid_number,
    owner_dl_number = v_application.new_owner_dl_number,
    vehicle_photo_url = v_application.new_owner_photo_url, -- UPDATE OWNER PHOTO HERE!
    -- Update QR code data with new owner info
    qr_code_data = jsonb_build_object(
      'registration_number', registration_number,
      'registration_plate', registration_plate,
      'owner_name_en', v_new_owner.full_name_en,
      'owner_name_bn', v_new_owner.full_name_bn,
      'owner_nid', v_new_owner.nid_number,
      'owner_photo_url', v_application.new_owner_photo_url, -- ADD PHOTO TO QR DATA
      'vehicle_name', vehicle_name,
      'model', model,
      'engine_number', engine_number,
      'vehicle_type', vehicle_type,
      'valid_until', valid_until,
      'transferred_on', CURRENT_DATE
    ),
    updated_at = NOW()
  WHERE id = v_application.registered_vehicle_id;
  
  -- Update vehicles table with new owner (FIX: ensures old owner doesn't see transferred vehicle)
  UPDATE vehicles
  SET 
    owner_id = v_application.new_owner_user_id,
    updated_at = NOW()
  WHERE id IN (
    SELECT vehicle_id 
    FROM registered_vehicles 
    WHERE id = v_application.registered_vehicle_id
  );
  
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

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Ownership transfer completed successfully',
    'application_id', p_application_id,
    'new_owner', v_new_owner.full_name_en
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Transfer failed: ' || SQLERRM
    );
END;
$$;

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Ownership transfer function updated!';
  RAISE NOTICE '📸 Now includes new owner photo update';
  RAISE NOTICE '🔄 Vehicle smart card will show new owner photo after transfer';
END $$;
