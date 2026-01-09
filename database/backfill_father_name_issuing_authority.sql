-- Backfill existing licenses with father_name and issuing_authority
-- This script safely updates existing licenses without affecting their operation

-- Step 1: Backfill father_name from license_applications
UPDATE licenses l
SET father_name = la.father_name
FROM license_applications la
WHERE l.application_id = la.id
  AND l.father_name IS NULL;

-- Step 2: Backfill issuing_authority from physical_exam_bookings and test_centers
UPDATE licenses l
SET issuing_authority = tc.office_name_en
FROM license_applications la
JOIN physical_exam_bookings peb ON peb.application_id = la.id
JOIN test_centers tc ON tc.id = peb.test_center_id
WHERE l.application_id = la.id
  AND l.issuing_authority IS NULL
  AND peb.status = 'completed';

-- Step 3: For licenses without physical exam booking, set default
UPDATE licenses
SET issuing_authority = 'BRTA Head Office'
WHERE issuing_authority IS NULL;

-- Step 4: For licenses without father_name in applications, set default
UPDATE licenses
SET father_name = 'N/A'
WHERE father_name IS NULL;

-- Verify the update
SELECT 
  COUNT(*) as total_licenses,
  COUNT(father_name) as with_father_name,
  COUNT(issuing_authority) as with_issuing_authority
FROM licenses;
