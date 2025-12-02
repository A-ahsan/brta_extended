-- Test if tax token renewal system is properly set up

-- 1. Check if renewal_days column exists in payments
SELECT 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_name='payments' 
  AND column_name IN ('renewal_days', 'vehicle_id', 'payment_type', 'metadata');

-- 2. Check if tax_token_renewals table exists
SELECT 
  table_name 
FROM information_schema.tables 
WHERE table_name='tax_token_renewals';

-- 3. Check if process_tax_token_renewal function exists
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines 
WHERE routine_name='process_tax_token_renewal';

-- 4. Check current structure of tax_token_renewals table
SELECT 
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name='tax_token_renewals'
ORDER BY ordinal_position;
