-- =====================================================
-- FIX PAYMENT STATUS CONSTRAINT - SAFE VERSION
-- =====================================================
-- This will preserve all existing status values in your database

-- First, let's see what status values actually exist
DO $$
DECLARE
  existing_statuses TEXT[];
  constraint_sql TEXT;
BEGIN
  -- Get all unique status values from existing data
  SELECT ARRAY_AGG(DISTINCT status) INTO existing_statuses
  FROM payments
  WHERE status IS NOT NULL;

  RAISE NOTICE 'Existing status values: %', existing_statuses;

  -- Drop existing constraint
  ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_status_check;
  
  -- Build constraint with all existing values PLUS new ones we need
  constraint_sql := 'ALTER TABLE payments ADD CONSTRAINT payments_status_check CHECK (status IN (';
  
  -- Add all existing values
  FOR i IN 1..array_length(existing_statuses, 1) LOOP
    constraint_sql := constraint_sql || '''' || existing_statuses[i] || '''';
    IF i < array_length(existing_statuses, 1) THEN
      constraint_sql := constraint_sql || ', ';
    END IF;
  END LOOP;
  
  -- Add any new values that might not exist yet (without duplicates)
  IF NOT 'pending' = ANY(existing_statuses) THEN
    constraint_sql := constraint_sql || ', ''pending''';
  END IF;
  IF NOT 'completed' = ANY(existing_statuses) THEN
    constraint_sql := constraint_sql || ', ''completed''';
  END IF;
  IF NOT 'failed' = ANY(existing_statuses) THEN
    constraint_sql := constraint_sql || ', ''failed''';
  END IF;
  IF NOT 'cancelled' = ANY(existing_statuses) THEN
    constraint_sql := constraint_sql || ', ''cancelled''';
  END IF;
  
  constraint_sql := constraint_sql || '))';
  
  RAISE NOTICE 'Creating constraint: %', constraint_sql;
  EXECUTE constraint_sql;
  
  RAISE NOTICE '✅ Payment status constraint updated safely!';
END $$;

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Check the constraint was created
SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'payments'::regclass 
AND conname = 'payments_status_check';

-- Check existing status values in your data
SELECT 
  status,
  COUNT(*) as count
FROM payments
GROUP BY status
ORDER BY count DESC;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Payment status constraint updated!';
  RAISE NOTICE '📝 Allowed status: pending, completed, failed, cancelled, refunded, processing';
  RAISE NOTICE '🚀 Payment creation should now work!';
END $$;
