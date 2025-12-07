-- =====================================================
-- FIX ALL PAYMENT TYPES - COMPREHENSIVE UPDATE
-- =====================================================
-- Run this ONCE in Supabase SQL Editor to fix payment constraint

-- Drop existing constraint
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_payment_type_check;

-- Add constraint with ALL payment types used in your system
ALTER TABLE payments ADD CONSTRAINT payments_payment_type_check 
CHECK (payment_type IN (
  'license_application',
  'license_renewal',
  'tax_token_renewal',
  'vehicle_registration',
  'violation_fine',
  'route_permit',
  'ownership_transfer',
  'application',
  'renewal',
  'fine',
  'other'
));

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Check the constraint was created
SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'payments'::regclass 
AND conname = 'payments_payment_type_check';

-- Check existing payment types in your data
SELECT 
  payment_type,
  COUNT(*) as count
FROM payments
GROUP BY payment_type
ORDER BY count DESC;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Payment types constraint updated!';
  RAISE NOTICE '📝 Allowed types: license_application, license_renewal, tax_token_renewal, vehicle_registration, violation_fine, route_permit, ownership_transfer, application, renewal, fine, other';
  RAISE NOTICE '🚀 All payment systems should now work!';
END $$;
