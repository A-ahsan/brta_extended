-- Diagnostic Script: Check Payment & License Application Status
-- Run this to diagnose any payment or license generation issues
-- Copy the results when reporting issues

-- ====================================
-- 1. CHECK RLS STATUS
-- ====================================
SELECT 
    '=== RLS STATUS ===' as section,
    'Should all be FALSE (f) after fix' as expected;

SELECT 
    relname as table_name,
    relrowsecurity as rls_enabled,
    CASE 
        WHEN relrowsecurity = false THEN '✅ OK - RLS Disabled'
        ELSE '❌ PROBLEM - RLS Still Enabled'
    END as status
FROM pg_class 
WHERE relname IN ('license_applications', 'payments', 'licenses')
ORDER BY relname;

-- ====================================
-- 2. CHECK FOR RLS POLICIES
-- ====================================
SELECT 
    '=== RLS POLICIES ===' as section,
    'Should have 0 policies after fix' as expected;

SELECT 
    tablename,
    policyname,
    '❌ This policy should be removed' as status
FROM pg_policies 
WHERE tablename IN ('license_applications', 'payments', 'licenses')
ORDER BY tablename, policyname;

-- If no rows returned, show success message
SELECT 
    CASE 
        WHEN (SELECT COUNT(*) FROM pg_policies WHERE tablename IN ('license_applications', 'payments', 'licenses')) = 0
        THEN '✅ SUCCESS: No RLS policies found'
        ELSE '❌ WARNING: RLS policies still exist'
    END as policy_status;

-- ====================================
-- 3. CHECK REQUIRED COLUMNS
-- ====================================
SELECT 
    '=== REQUIRED COLUMNS ===' as section;

-- Check license_applications columns
SELECT 
    'license_applications' as table_name,
    column_name,
    data_type,
    column_default,
    '✅ Present' as status
FROM information_schema.columns
WHERE table_name = 'license_applications'
AND column_name IN ('payment', 'payment_completed_at', 'license_generated', 'license_generated_at', 'status')
ORDER BY 
    CASE column_name
        WHEN 'payment' THEN 1
        WHEN 'payment_completed_at' THEN 2
        WHEN 'status' THEN 3
        WHEN 'license_generated' THEN 4
        WHEN 'license_generated_at' THEN 5
    END;

-- Check payments columns
SELECT 
    'payments' as table_name,
    column_name,
    data_type,
    '✅ Present' as status
FROM information_schema.columns
WHERE table_name = 'payments'
AND column_name IN ('payment_type', 'license_id', 'vehicle_id', 'application_id', 'status', 'tran_id')
ORDER BY 
    CASE column_name
        WHEN 'application_id' THEN 1
        WHEN 'payment_type' THEN 2
        WHEN 'license_id' THEN 3
        WHEN 'vehicle_id' THEN 4
        WHEN 'status' THEN 5
        WHEN 'tran_id' THEN 6
    END;

-- ====================================
-- 4. RECENT APPLICATIONS STATUS
-- ====================================
SELECT 
    '=== RECENT APPLICATIONS (Last 7 days) ===' as section;

SELECT 
    la.application_number,
    la.license_type,
    la.license_category,
    la.full_name_en,
    la.status as app_status,
    la.payment as payment_flag,
    CASE WHEN la.payment = 1 THEN '✅' ELSE '❌' END as payment_ok,
    la.payment_completed_at,
    la.license_generated,
    CASE WHEN la.license_generated = 1 THEN '✅' ELSE '⏳' END as license_ok,
    la.created_at::date as created
FROM license_applications la
WHERE la.created_at > NOW() - INTERVAL '7 days'
ORDER BY la.created_at DESC
LIMIT 20;

-- ====================================
-- 5. RECENT PAYMENTS STATUS
-- ====================================
SELECT 
    '=== RECENT PAYMENTS (Last 7 days) ===' as section;

SELECT 
    p.tran_id,
    p.payment_type,
    p.status as payment_status,
    CASE WHEN p.status = 'success' THEN '✅' ELSE '❌' END as status_ok,
    p.amount,
    la.application_number,
    la.payment as app_payment_flag,
    CASE 
        WHEN p.status = 'success' AND la.payment = 1 THEN '✅ Synced'
        WHEN p.status = 'success' AND la.payment = 0 THEN '❌ NOT SYNCED - PROBLEM!'
        ELSE '⏳ Pending'
    END as sync_status,
    p.created_at::timestamp as payment_time
FROM payments p
LEFT JOIN license_applications la ON la.id = p.application_id
WHERE p.created_at > NOW() - INTERVAL '7 days'
AND p.payment_type = 'application'
ORDER BY p.created_at DESC
LIMIT 20;

-- ====================================
-- 6. PROBLEM PAYMENTS (Not Synced)
-- ====================================
SELECT 
    '=== PROBLEM PAYMENTS (Success but not updated) ===' as section;

SELECT 
    p.tran_id,
    p.created_at,
    p.amount,
    la.application_number,
    la.status as app_status,
    la.payment as app_payment_flag,
    '❌ THIS NEEDS MANUAL FIX' as action,
    'UPDATE license_applications SET payment=1, status=''payment_completed'', payment_completed_at=NOW() WHERE id=''' || la.id || '''' as fix_sql
FROM payments p
JOIN license_applications la ON la.id = p.application_id
WHERE p.status = 'success' 
AND la.payment = 0
AND p.payment_type = 'application'
ORDER BY p.created_at DESC;

-- ====================================
-- 7. APPLICATIONS READY FOR LICENSE
-- ====================================
SELECT 
    '=== APPLICATIONS READY FOR LICENSE GENERATION ===' as section;

SELECT 
    la.application_number,
    la.license_type,
    la.license_category,
    la.full_name_en,
    la.payment,
    la.status,
    la.license_generated,
    CASE 
        WHEN la.license_generated = 1 THEN '✅ Already Generated'
        WHEN la.payment = 1 AND la.license_generated = 0 THEN '🎉 READY TO GENERATE'
        ELSE '⏳ Not Ready Yet'
    END as generation_status,
    la.id as application_id,
    la.user_id
FROM license_applications la
WHERE la.payment = 1 
AND la.created_at > NOW() - INTERVAL '30 days'
ORDER BY la.license_generated, la.created_at DESC
LIMIT 20;

-- ====================================
-- 8. GENERATED LICENSES
-- ====================================
SELECT 
    '=== GENERATED LICENSES (Last 30 days) ===' as section;

SELECT 
    l.license_number,
    l.license_type,
    l.license_category,
    l.full_name_en,
    l.issue_date,
    l.expiry_date,
    l.status as license_status,
    l.expired,
    CASE WHEN l.expired = 0 THEN '✅ Valid' ELSE '⚠️ Expired' END as validity,
    la.application_number,
    l.created_at::date as generated_on
FROM licenses l
LEFT JOIN license_applications la ON la.id = l.application_id
WHERE l.created_at > NOW() - INTERVAL '30 days'
ORDER BY l.created_at DESC
LIMIT 20;

-- ====================================
-- 9. USER WITH MULTIPLE LICENSES
-- ====================================
SELECT 
    '=== USERS WITH MULTIPLE LICENSES ===' as section;

SELECT 
    l.user_id,
    COUNT(*) as license_count,
    STRING_AGG(DISTINCT l.license_type, ', ') as license_types,
    STRING_AGG(DISTINCT l.license_category, ', ') as categories,
    STRING_AGG(l.license_number, ', ') as license_numbers
FROM licenses l
GROUP BY l.user_id
HAVING COUNT(*) > 1
ORDER BY license_count DESC;

-- ====================================
-- 10. SUMMARY
-- ====================================
SELECT 
    '=== OVERALL SUMMARY ===' as section;

SELECT 
    'Total Applications (7 days)' as metric,
    COUNT(*)::text as value
FROM license_applications
WHERE created_at > NOW() - INTERVAL '7 days'
UNION ALL
SELECT 
    'Paid Applications (7 days)',
    COUNT(*)::text
FROM license_applications
WHERE created_at > NOW() - INTERVAL '7 days' AND payment = 1
UNION ALL
SELECT 
    'Generated Licenses (7 days)',
    COUNT(*)::text
FROM licenses
WHERE created_at > NOW() - INTERVAL '7 days'
UNION ALL
SELECT 
    'Successful Payments (7 days)',
    COUNT(*)::text
FROM payments
WHERE created_at > NOW() - INTERVAL '7 days' AND status = 'success'
UNION ALL
SELECT 
    '⚠️ Problem Payments (success but not synced)',
    COUNT(*)::text
FROM payments p
JOIN license_applications la ON la.id = p.application_id
WHERE p.status = 'success' AND la.payment = 0;

-- ====================================
-- FINAL STATUS
-- ====================================
SELECT 
    '=== DIAGNOSTIC COMPLETE ===' as section,
    CASE 
        WHEN (SELECT relrowsecurity FROM pg_class WHERE relname = 'license_applications') = false
            AND (SELECT COUNT(*) FROM pg_policies WHERE tablename IN ('license_applications', 'payments', 'licenses')) = 0
            AND (SELECT COUNT(*) FROM payments p JOIN license_applications la ON la.id = p.application_id WHERE p.status = 'success' AND la.payment = 0) = 0
        THEN '✅ ALL SYSTEMS OPERATIONAL - No issues detected'
        ELSE '⚠️ ISSUES DETECTED - Review results above'
    END as final_status;
