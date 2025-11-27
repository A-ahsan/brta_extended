-- Minimal Face Verification Setup (No image storage needed)
-- Run this in your Supabase SQL Editor

-- ============================================
-- Update Notification Function for Separate User/Admin Messages
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
  
  -- Create notification for admin with custom message if provided
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

-- Done! Your database is ready for face verification
SELECT 'Face Verification Database Setup Complete!' as message;
