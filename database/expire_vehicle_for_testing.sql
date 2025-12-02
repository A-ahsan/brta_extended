-- Script to expire a vehicle and its tax token for testing renewal feature
-- Replace YOUR_VEHICLE_ID with your actual vehicle ID

-- Step 1: Find your vehicle ID
-- Run this first to get your vehicle ID:
SELECT 
  id,
  registration_number,
  registration_plate,
  vehicle_name,
  model,
  valid_until,
  status
FROM registered_vehicles
WHERE user_id = auth.uid()  -- Shows your vehicles
ORDER BY created_at DESC;

-- Step 2: Update vehicle to expired (replace the ID)
UPDATE registered_vehicles 
SET 
  valid_until = '2024-01-01',
  status = 'expired'
WHERE id = 'YOUR_VEHICLE_ID';  -- Replace with actual ID from Step 1

-- Step 3: Update tax token to expired
UPDATE tax_tokens 
SET 
  valid_until = '2024-01-01',
  status = 'expired'
WHERE registered_vehicle_id = 'YOUR_VEHICLE_ID';  -- Same ID as above

-- Step 4: Verify the update
SELECT 
  rv.id,
  rv.registration_number,
  rv.registration_plate->>'en' as plate,
  rv.vehicle_name,
  rv.valid_until as vehicle_expiry,
  rv.status as vehicle_status,
  tt.token_number,
  tt.valid_until as token_expiry,
  tt.status as token_status
FROM registered_vehicles rv
LEFT JOIN tax_tokens tt ON tt.registered_vehicle_id = rv.id
WHERE rv.id = 'YOUR_VEHICLE_ID';  -- Same ID as above

-- Expected result: Both vehicle_expiry and token_expiry should be 2024-01-01
-- Both statuses should be 'expired'
