-- Add 'violation_fine' and 'vehicle_registration' to payment_type constraint

-- Run everything in a transaction to ensure atomicity
BEGIN;

-- Step 1: Drop existing constraint FIRST (before any updates)
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_payment_type_check;

-- Step 2: Ensure payment_type column exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payments' AND column_name = 'payment_type'
  ) THEN
    ALTER TABLE payments ADD COLUMN payment_type VARCHAR(30);
  END IF;
END $$;

-- Step 3: Update any NULL or invalid payment_type values to valid ones
UPDATE payments 
SET payment_type = CASE 
  WHEN payment_type IS NULL THEN 'license_application'
  WHEN payment_type = 'application' THEN 'license_application'
  WHEN payment_type NOT IN (
    'license_application', 
    'license_renewal', 
    'tax_token_renewal', 
    'vehicle_registration',
    'violation_fine',
    'route_permit',
    'ownership_transfer'
  ) THEN 'license_application'
  ELSE payment_type
END;

-- Step 4: Add new constraint with all payment types
ALTER TABLE payments ADD CONSTRAINT payments_payment_type_check 
  CHECK (payment_type IN (
    'license_application', 
    'license_renewal', 
    'tax_token_renewal', 
    'vehicle_registration',
    'violation_fine',
    'route_permit',
    'ownership_transfer'
  ));

-- Commit the transaction
COMMIT;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Payment types updated!';
  RAISE NOTICE 'Added: vehicle_registration, violation_fine, route_permit, ownership_transfer';
END $$;
