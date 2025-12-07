    -- =====================================================
-- MANUALLY EXECUTE PENDING OWNERSHIP TRANSFER
-- =====================================================
-- Use this to complete a transfer that had payment but didn't execute

-- First, let's see the pending transfer
SELECT 
  id,
  application_number,
  vehicle_registration_number,
  vehicle_name,
  new_owner_name_en,
  status,
  payment_status,
  created_at
FROM ownership_transfer_applications
WHERE payment_status = 'completed' AND status != 'completed'
ORDER BY created_at DESC
LIMIT 5;

    -- Copy the ID from above and run this to execute the transfer:
    -- Replace 'YOUR_APPLICATION_ID_HERE' with the actual UUID

    SELECT execute_ownership_transfer('0d981d8b-ddd6-48f9-bd1d-9e1d5a21300e'::UUID);

    -- After running, verify the transfer completed:
    SELECT 
    id,
    application_number,
    status,
    transfer_completed_at
    FROM ownership_transfer_applications
    WHERE application_number = 'OT25792216'  -- Replace with your application number
    LIMIT 1;

    -- Check if vehicle owner was updated:
    SELECT 
    registration_number,
    owner_name_en,
    owner_dl_number,
    vehicle_photo_url,
    updated_at
    FROM registered_vehicles
    WHERE registration_number = 'REG2025867420'  -- Replace with your vehicle registration
    LIMIT 1;
