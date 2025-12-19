-- =====================================================
-- MIGRATE VEHICLE OWNERSHIP - FIX EXISTING TRANSFERS
-- =====================================================
-- This fixes vehicles.owner_id for already-transferred vehicles
-- Run this ONCE after deploying the updated execute_ownership_transfer function

-- =====================================================
-- STEP 1: CHECK MISMATCHED OWNERSHIP
-- =====================================================
-- Run this first to see how many vehicles need fixing
SELECT 
  v.id AS vehicle_id,
  v.engine_number,
  v.vehicle_name,
  v.owner_id AS vehicles_owner_id,
  rv.user_id AS registered_vehicles_owner_id,
  rv.owner_name_en AS current_registered_owner,
  CASE 
    WHEN v.owner_id = rv.user_id THEN '✅ MATCH'
    ELSE '❌ MISMATCH'
  END AS status
FROM vehicles v
INNER JOIN registered_vehicles rv ON v.id = rv.vehicle_id
WHERE v.owner_id != rv.user_id;

-- =====================================================
-- STEP 2: FIX THE MISMATCHES
-- =====================================================
-- This syncs vehicles.owner_id with registered_vehicles.user_id

UPDATE vehicles v
SET 
  owner_id = rv.user_id,
  updated_at = NOW()
FROM registered_vehicles rv
WHERE v.id = rv.vehicle_id
  AND v.owner_id != rv.user_id;

-- =====================================================
-- STEP 3: VERIFY THE FIX
-- =====================================================
-- Run this to confirm all are now synced
SELECT 
  COUNT(*) AS total_registered_vehicles,
  SUM(CASE WHEN v.owner_id = rv.user_id THEN 1 ELSE 0 END) AS matched,
  SUM(CASE WHEN v.owner_id != rv.user_id THEN 1 ELSE 0 END) AS mismatched
FROM vehicles v
INNER JOIN registered_vehicles rv ON v.id = rv.vehicle_id;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Vehicle ownership migration complete!';
  RAISE NOTICE '📊 Check the verification query above to confirm 0 mismatches';
  RAISE NOTICE '🎯 Old owners will no longer see transferred vehicles in registration modal';
END $$;
