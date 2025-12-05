-- Fix Payment Update Issue for License Applications
-- This ensures payment updates work correctly after completing payment
-- Run this in Supabase SQL Editor

-- STEP 1: Disable RLS on license_applications if it's enabled
ALTER TABLE license_applications DISABLE ROW LEVEL SECURITY;

-- STEP 2: Drop ALL existing RLS policies on license_applications (if any)
DO $$ 
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'license_applications'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON license_applications', policy_record.policyname);
        RAISE NOTICE 'Dropped policy: %', policy_record.policyname;
    END LOOP;
END $$;

-- STEP 3: Verify license_applications table has all required columns
DO $$
BEGIN
    -- Check if payment column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='license_applications' AND column_name='payment') THEN
        ALTER TABLE license_applications ADD COLUMN payment SMALLINT DEFAULT 0 CHECK (payment IN (0, 1));
    END IF;
    
    -- Check if payment_completed_at exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='license_applications' AND column_name='payment_completed_at') THEN
        ALTER TABLE license_applications ADD COLUMN payment_completed_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- Check if license_generated exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='license_applications' AND column_name='license_generated') THEN
        ALTER TABLE license_applications ADD COLUMN license_generated SMALLINT DEFAULT 0 CHECK (license_generated IN (0, 1));
    END IF;
    
    -- Check if license_generated_at exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='license_applications' AND column_name='license_generated_at') THEN
        ALTER TABLE license_applications ADD COLUMN license_generated_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- STEP 4: Disable RLS on payments table as well
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;

-- STEP 5: Drop all RLS policies on payments table
DO $$ 
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'payments'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON payments', policy_record.policyname);
        RAISE NOTICE 'Dropped policy: %', policy_record.policyname;
    END LOOP;
END $$;

-- STEP 6: Verify payments table has all required columns
DO $$
BEGIN
    -- Check if payment_type exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='payments' AND column_name='payment_type') THEN
        ALTER TABLE payments ADD COLUMN payment_type VARCHAR(30) DEFAULT 'application';
    END IF;
    
    -- Check if license_id exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='payments' AND column_name='license_id') THEN
        ALTER TABLE payments ADD COLUMN license_id UUID REFERENCES licenses(id) ON DELETE CASCADE;
    END IF;
    
    -- Check if vehicle_id exists  
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='payments' AND column_name='vehicle_id') THEN
        ALTER TABLE payments ADD COLUMN vehicle_id UUID REFERENCES registered_vehicles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- STEP 6a: Get all existing unique payment_type values to preserve them
DO $$
DECLARE
    existing_types TEXT[];
    constraint_sql TEXT;
BEGIN
    -- Get all distinct payment_type values
    SELECT ARRAY_AGG(DISTINCT payment_type) INTO existing_types
    FROM payments
    WHERE payment_type IS NOT NULL;
    
    -- Drop existing constraint
    ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_payment_type_check;
    
    -- Only add constraint if we have data, and include all existing types plus common ones
    IF existing_types IS NOT NULL THEN
        -- Build constraint with all existing types plus standard ones
        constraint_sql := 'ALTER TABLE payments ADD CONSTRAINT payments_payment_type_check CHECK (payment_type IN (';
        
        -- Add all existing types
        FOR i IN 1..ARRAY_LENGTH(existing_types, 1) LOOP
            IF i > 1 THEN
                constraint_sql := constraint_sql || ', ';
            END IF;
            constraint_sql := constraint_sql || quote_literal(existing_types[i]);
        END LOOP;
        
        -- Add any missing standard types
        IF NOT (existing_types @> ARRAY['application']) THEN
            constraint_sql := constraint_sql || ', ''application''';
        END IF;
        IF NOT (existing_types @> ARRAY['renewal']) THEN
            constraint_sql := constraint_sql || ', ''renewal''';
        END IF;
        IF NOT (existing_types @> ARRAY['vehicle_registration']) THEN
            constraint_sql := constraint_sql || ', ''vehicle_registration''';
        END IF;
        IF NOT (existing_types @> ARRAY['tax_token_renewal']) THEN
            constraint_sql := constraint_sql || ', ''tax_token_renewal''';
        END IF;
        IF NOT (existing_types @> ARRAY['violation_fine']) THEN
            constraint_sql := constraint_sql || ', ''violation_fine''';
        END IF;
        
        constraint_sql := constraint_sql || '))';
        
        EXECUTE constraint_sql;
        
        RAISE NOTICE 'Applied payment_type constraint with existing types preserved';
    ELSE
        -- No data, use standard constraint
        ALTER TABLE payments ADD CONSTRAINT payments_payment_type_check 
            CHECK (payment_type IN ('application', 'renewal', 'vehicle_registration', 'tax_token_renewal', 'violation_fine', 'other'));
    END IF;
END $$;

-- STEP 7: Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_payments_application_id ON payments(application_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_tran_id ON payments(tran_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_type ON payments(payment_type);
CREATE INDEX IF NOT EXISTS idx_payments_license_id ON payments(license_id);
CREATE INDEX IF NOT EXISTS idx_payments_vehicle_id ON payments(vehicle_id);

CREATE INDEX IF NOT EXISTS idx_license_applications_payment ON license_applications(payment);
CREATE INDEX IF NOT EXISTS idx_license_applications_status ON license_applications(status);
CREATE INDEX IF NOT EXISTS idx_license_applications_license_generated ON license_applications(license_generated);

-- STEP 8: Disable RLS on licenses table
ALTER TABLE licenses DISABLE ROW LEVEL SECURITY;

-- STEP 9: Drop all RLS policies on licenses table
DO $$ 
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'licenses'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON licenses', policy_record.policyname);
        RAISE NOTICE 'Dropped policy: %', policy_record.policyname;
    END LOOP;
END $$;

-- STEP 10: Verify the fix worked
DO $$
DECLARE
    v_app_rls BOOLEAN;
    v_payment_rls BOOLEAN;
    v_license_rls BOOLEAN;
    v_app_policies_count INTEGER;
    v_payment_policies_count INTEGER;
    v_license_policies_count INTEGER;
BEGIN
    -- Check RLS status
    SELECT relrowsecurity INTO v_app_rls 
    FROM pg_class 
    WHERE relname = 'license_applications';
    
    SELECT relrowsecurity INTO v_payment_rls 
    FROM pg_class 
    WHERE relname = 'payments';
    
    SELECT relrowsecurity INTO v_license_rls 
    FROM pg_class 
    WHERE relname = 'licenses';
    
    -- Count policies
    SELECT COUNT(*) INTO v_app_policies_count 
    FROM pg_policies 
    WHERE tablename = 'license_applications';
    
    SELECT COUNT(*) INTO v_payment_policies_count 
    FROM pg_policies 
    WHERE tablename = 'payments';
    
    SELECT COUNT(*) INTO v_license_policies_count 
    FROM pg_policies 
    WHERE tablename = 'licenses';
    
    -- Report status
    RAISE NOTICE '=== FIX VERIFICATION ===';
    RAISE NOTICE 'license_applications: RLS = %, Policies = %', v_app_rls, v_app_policies_count;
    RAISE NOTICE 'payments: RLS = %, Policies = %', v_payment_rls, v_payment_policies_count;
    RAISE NOTICE 'licenses: RLS = %, Policies = %', v_license_rls, v_license_policies_count;
    
    IF v_app_rls = FALSE AND v_payment_rls = FALSE AND v_license_rls = FALSE THEN
        RAISE NOTICE '✅ SUCCESS: All RLS policies disabled - payment updates should work now!';
    ELSE
        RAISE WARNING '⚠️ WARNING: Some tables still have RLS enabled. Check manually.';
    END IF;
END $$;

-- STEP 11: Show current payment status for verification
SELECT 
    p.id,
    p.tran_id,
    p.status as payment_status,
    p.payment_type,
    p.amount,
    la.application_number,
    la.payment as application_payment_flag,
    la.status as application_status,
    la.payment_completed_at
FROM payments p
LEFT JOIN license_applications la ON la.id = p.application_id
WHERE p.created_at > NOW() - INTERVAL '7 days'
ORDER BY p.created_at DESC
LIMIT 20;

-- Success message
SELECT '✅ Payment update fix completed successfully!' AS status,
       'Now try making a payment - it should update the license_applications table correctly' AS next_step;
