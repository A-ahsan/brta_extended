-- Fix Vehicle Registration Issues
-- 1. Update payment_type constraint to include vehicle_registration
-- 2. Update notification_type constraint to include vehicle_registration
-- 3. Create storage bucket for vehicle documents (must be done in Supabase UI)

-- ===== FIX 1: Payment Type Constraint =====
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_payment_type_check;
ALTER TABLE payments ADD CONSTRAINT payments_payment_type_check 
  CHECK (payment_type IN ('application', 'renewal', 'vehicle_registration', 'fine', 'other'));

-- ===== FIX 2: Notification Type Constraint =====
-- CRITICAL: Include ALL notification types used in the system
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_notification_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_notification_type_check 
  CHECK (notification_type IN (
    'application', 
    'verification', 
    'exam', 
    'payment', 
    'approval', 
    'rejection', 
    'general', 
    'renewal', 
    'vehicle_registration', 
    'vehicle_added', 
    'admin_vehicle_alert', 
    'vehicle_registration_complete'
  ));

-- ===== VERIFY CONSTRAINTS =====
SELECT 'PAYMENT CONSTRAINT:' as check_type, conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conname = 'payments_payment_type_check'
UNION ALL
SELECT 'NOTIFICATION CONSTRAINT:' as check_type, conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conname = 'notifications_notification_type_check';

-- ===== NOTE: Storage Bucket =====
-- Create 'vehicle-documents' bucket manually in Supabase Storage UI
-- Make it PUBLIC
-- Add these 3 policies:
--   1. Public read access
--   2. Authenticated users can upload
--   3. Users can update own files
