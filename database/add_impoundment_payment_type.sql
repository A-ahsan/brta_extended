-- =====================================================
-- ADD IMPOUNDMENT TO PAYMENT TYPES
-- =====================================================
-- Run this in Supabase SQL Editor to add 'impoundment' payment type

-- Drop existing constraint
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_payment_type_check;

-- Add constraint with ALL payment types including impoundment
ALTER TABLE payments ADD CONSTRAINT payments_payment_type_check 
CHECK (payment_type IN (
  'license_application',
  'license_renewal',
  'tax_token_renewal',
  'vehicle_registration',
  'violation_fine',
  'route_permit',
  'ownership_transfer',
  'impoundment',
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

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Payment Type Constraint Updated!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✓ Added "impoundment" to allowed payment types';
  RAISE NOTICE '✓ Impoundment payments can now be processed';
  RAISE NOTICE '========================================';
END $$;
