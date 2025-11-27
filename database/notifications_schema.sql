-- Notifications Table
-- Stores real-time notifications for users and admins
-- NO RLS policies for easy database management

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Recipient
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_type VARCHAR(10) CHECK (recipient_type IN ('user', 'admin', 'police')) NOT NULL,
  
  -- Notification Content
  title_en VARCHAR(255) NOT NULL,
  title_bn VARCHAR(255) NOT NULL,
  message_en TEXT NOT NULL,
  message_bn TEXT NOT NULL,
  
  -- Type & Priority
  notification_type VARCHAR(20) CHECK (notification_type IN ('application', 'verification', 'exam', 'payment', 'approval', 'rejection', 'general')) NOT NULL,
  priority VARCHAR(10) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')) NOT NULL,
  
  -- Related Data
  application_id UUID REFERENCES license_applications(id) ON DELETE SET NULL,
  action_url TEXT,
  
  -- Status
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_notif_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_recipient_type ON notifications(recipient_type);
CREATE INDEX IF NOT EXISTS idx_notif_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notif_created ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notif_application ON notifications(application_id);

-- Function to create notification for user and admin with separate messages
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

-- NOTE: NO RLS policies for easy management
