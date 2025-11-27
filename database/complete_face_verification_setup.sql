-- Complete Face Verification Setup
-- Run this entire file in your Supabase SQL Editor

-- ============================================
-- PART 1: Update Notification Function
-- ============================================

CREATE OR REPLACE FUNCTION create_dual_notification(
  p_user_id UUID,
  p_title_en VARCHAR,
  p_title_bn VARCHAR,
  p_message_en TEXT,
  p_message_bn TEXT,
  p_type VARCHAR,
  p_application_id UUID DEFAULT NULL,
  p_action_url TEXT DEFAULT NULL,
  p_admin_title_en VARCHAR DEFAULT NULL,
  p_admin_title_bn VARCHAR DEFAULT NULL,
  p_admin_message_en TEXT DEFAULT NULL,
  p_admin_message_bn TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  -- Create notification for user
  INSERT INTO notifications (
    user_id, recipient_type, title_en, title_bn, 
    message_en, message_bn, notification_type, 
    application_id, action_url
  ) VALUES (
    p_user_id, 'user', p_title_en, p_title_bn,
    p_message_en, p_message_bn, p_type,
    p_application_id, p_action_url
  );
  
  -- Create notification for admin with custom message if provided, otherwise use user message
  INSERT INTO notifications (
    user_id, recipient_type, title_en, title_bn,
    message_en, message_bn, notification_type,
    application_id, action_url
  ) VALUES (
    p_user_id, 'admin', 
    COALESCE(p_admin_title_en, p_title_en), 
    COALESCE(p_admin_title_bn, p_title_bn),
    COALESCE(p_admin_message_en, p_message_en), 
    COALESCE(p_admin_message_bn, p_message_bn), 
    p_type,
    p_application_id, p_action_url
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PART 2: Add Face Verification Fields
-- ============================================

ALTER TABLE license_applications
ADD COLUMN IF NOT EXISTS live_face_url TEXT,
ADD COLUMN IF NOT EXISTS face_match_score DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS face_verified_at TIMESTAMP WITH TIME ZONE;

-- ============================================
-- PART 3: Create Storage Bucket
-- ============================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('license-live-faces', 'license-live-faces', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- PART 4: Storage Policies
-- ============================================

-- Allow authenticated uploads
CREATE POLICY "Allow authenticated uploads to license-live-faces"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'license-live-faces');

-- Allow public read
CREATE POLICY "Allow public read from license-live-faces"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'license-live-faces');

-- Allow users to update their own files
CREATE POLICY "Allow users to update their own files in license-live-faces"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'license-live-faces' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to delete their own files
CREATE POLICY "Allow users to delete their own files in license-live-faces"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'license-live-faces' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================
-- VERIFICATION
-- ============================================

-- Verify the setup
SELECT 'Notification function updated' as status
WHERE EXISTS (
  SELECT 1 FROM pg_proc 
  WHERE proname = 'create_dual_notification'
);

SELECT 'Face verification columns added' as status
WHERE EXISTS (
  SELECT 1 FROM information_schema.columns 
  WHERE table_name = 'license_applications' 
  AND column_name IN ('live_face_url', 'face_match_score', 'face_verified_at')
);

SELECT 'Storage bucket created' as status
WHERE EXISTS (
  SELECT 1 FROM storage.buckets 
  WHERE id = 'license-live-faces'
);

-- Done!
SELECT 'Face Verification Setup Complete!' as message;
