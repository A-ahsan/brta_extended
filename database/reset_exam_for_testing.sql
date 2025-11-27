-- Quick SQL to Reset Online Exam for Testing
-- Run this in Supabase SQL Editor to reset exam for a user

-- Method 1: Reset by application number
UPDATE license_applications
SET 
  online_exam = 0,
  online_exam_completed_at = NULL
WHERE application_number = 'DL2025321289';  -- Replace with your application number

-- Method 2: Reset all exams for a specific user (use their email)
UPDATE license_applications
SET 
  online_exam = 0,
  online_exam_completed_at = NULL
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'your-email@example.com'  -- Replace with user email
);

-- Method 3: Reset the most recent application
UPDATE license_applications
SET 
  online_exam = 0,
  online_exam_completed_at = NULL
WHERE id = (
  SELECT id FROM license_applications
  ORDER BY created_at DESC
  LIMIT 1
);

-- Method 4: Reset ALL applications (use carefully!)
UPDATE license_applications
SET 
  online_exam = 0,
  online_exam_completed_at = NULL;

-- To check current status after reset:
SELECT 
  application_number,
  full_name_en,
  online_exam,
  online_exam_completed_at,
  created_at
FROM license_applications
ORDER BY created_at DESC
LIMIT 5;
