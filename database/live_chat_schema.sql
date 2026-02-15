-- ============================================
-- LIVE CHAT SYSTEM - Database Schema
-- Facebook Messenger-style Real-time Chat
-- ============================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Table 1: chat_sessions
-- Stores chat session information
-- ============================================
CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    session_type TEXT NOT NULL CHECK (session_type IN ('ai_chat', 'live_chat')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'closed', 'cancelled')),
    language TEXT NOT NULL CHECK (language IN ('en', 'bn')),
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('normal', 'high', 'urgent')),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    feedback_text TEXT,
    user_name TEXT,
    user_email TEXT,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assigned_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX idx_chat_sessions_admin_id ON chat_sessions(admin_id);
CREATE INDEX idx_chat_sessions_status ON chat_sessions(status);
CREATE INDEX idx_chat_sessions_created_at ON chat_sessions(created_at);

-- ============================================
-- Table 2: chat_messages
-- Stores individual messages
-- ============================================
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'admin', 'system')),
    sender_name TEXT NOT NULL,
    message_text TEXT,
    attachment_url TEXT,
    attachment_type TEXT CHECK (attachment_type IN ('image', 'document', NULL)),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX idx_chat_messages_is_read ON chat_messages(is_read);

-- ============================================
-- Table 3: admin_presence
-- Tracks admin online/offline status
-- ============================================
CREATE TABLE IF NOT EXISTS admin_presence (
    admin_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    is_available BOOLEAN DEFAULT FALSE,
    current_active_chats INTEGER DEFAULT 0,
    max_concurrent_chats INTEGER DEFAULT 3,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status_message TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Table 4: quick_replies
-- Pre-written message templates for admins
-- ============================================
CREATE TABLE IF NOT EXISTS quick_replies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    content_en TEXT NOT NULL,
    content_bn TEXT NOT NULL,
    category TEXT DEFAULT 'general' CHECK (category IN ('application', 'payment', 'document', 'vehicle', 'general', 'greeting')),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for quick replies
CREATE INDEX idx_quick_replies_category ON quick_replies(category);
CREATE INDEX idx_quick_replies_is_active ON quick_replies(is_active);

-- ============================================
-- Table 5: typing_indicators
-- Real-time typing status
-- ============================================
CREATE TABLE IF NOT EXISTS typing_indicators (
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    is_typing BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (session_id, user_id)
);

-- ============================================
-- Functions & Triggers
-- ============================================

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: chat_sessions updated_at
DROP TRIGGER IF EXISTS update_chat_sessions_updated_at ON chat_sessions;
CREATE TRIGGER update_chat_sessions_updated_at
    BEFORE UPDATE ON chat_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger: admin_presence updated_at
DROP TRIGGER IF EXISTS update_admin_presence_updated_at ON admin_presence;
CREATE TRIGGER update_admin_presence_updated_at
    BEFORE UPDATE ON admin_presence
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger: quick_replies updated_at
DROP TRIGGER IF EXISTS update_quick_replies_updated_at ON quick_replies;
CREATE TRIGGER update_quick_replies_updated_at
    BEFORE UPDATE ON quick_replies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function: Auto-assign chat to available admin
CREATE OR REPLACE FUNCTION auto_assign_chat()
RETURNS TRIGGER AS $$
DECLARE
    available_admin UUID;
BEGIN
    -- Only for live_chat sessions that are pending
    IF NEW.session_type = 'live_chat' AND NEW.status = 'pending' THEN
        -- Find first available admin with least active chats
        SELECT admin_id INTO available_admin
        FROM admin_presence
        WHERE is_available = TRUE 
          AND current_active_chats < max_concurrent_chats
        ORDER BY current_active_chats ASC, last_seen DESC
        LIMIT 1;
        
        -- If admin found, assign immediately
        IF available_admin IS NOT NULL THEN
            NEW.admin_id := available_admin;
            NEW.status := 'active';
            NEW.assigned_at := NOW();
            
            -- Increment admin's active chat count
            UPDATE admin_presence
            SET current_active_chats = current_active_chats + 1,
                last_seen = NOW()
            WHERE admin_id = available_admin;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Auto-assign on insert
DROP TRIGGER IF EXISTS trigger_auto_assign_chat ON chat_sessions;
CREATE TRIGGER trigger_auto_assign_chat
    BEFORE INSERT ON chat_sessions
    FOR EACH ROW
    EXECUTE FUNCTION auto_assign_chat();

-- Function: Update last_message_at when new message arrives
CREATE OR REPLACE FUNCTION update_session_last_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE chat_sessions
    SET last_message_at = NOW()
    WHERE id = NEW.session_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Update last_message_at
DROP TRIGGER IF EXISTS trigger_update_last_message ON chat_messages;
CREATE TRIGGER trigger_update_last_message
    AFTER INSERT ON chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_session_last_message();

-- Function: Update admin chat count when session closes
CREATE OR REPLACE FUNCTION update_admin_chat_count()
RETURNS TRIGGER AS $$
BEGIN
    -- When chat is closed, decrement admin's active count
    IF NEW.status = 'closed' AND OLD.status != 'closed' AND NEW.admin_id IS NOT NULL THEN
        UPDATE admin_presence
        SET current_active_chats = GREATEST(0, current_active_chats - 1)
        WHERE admin_id = NEW.admin_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Update admin count on close
DROP TRIGGER IF EXISTS trigger_update_admin_count ON chat_sessions;
CREATE TRIGGER trigger_update_admin_count
    AFTER UPDATE ON chat_sessions
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION update_admin_chat_count();

-- ============================================
-- Enable Realtime for all tables
-- ============================================
-- Note: If you get errors, just enable via Supabase Dashboard:
-- Go to Database → Replication → Enable for these tables

-- Safely add tables to realtime publication
DO $$ 
BEGIN
    -- Try to add each table, ignore if already exists
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE chat_sessions;
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE admin_presence;
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE typing_indicators;
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE quick_replies;
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;
END $$;

-- ============================================
-- Insert sample quick replies
-- ============================================
INSERT INTO quick_replies (title, content_en, content_bn, category) VALUES
('Welcome', 'Hello! Welcome to BRTA Live Chat. How can I assist you today?', 'হ্যালো! BRTA লাইভ চ্যাটে স্বাগতম। আমি আজ আপনাকে কীভাবে সাহায্য করতে পারি?', 'greeting'),
('Check Application', 'Let me check your application status. Please provide your application number.', 'আমি আপনার আবেদনের স্থিতি পরীক্ষা করছি। অনুগ্রহ করে আপনার আবেদন নম্বর প্রদান করুন।', 'application'),
('Upload Document', 'Please upload the required document. You can click the attachment button to upload.', 'অনুগ্রহ করে প্রয়োজনীয় নথি আপলোড করুন। আপনি আপলোড করতে সংযুক্তি বোতাম ক্লিক করতে পারেন।', 'document'),
('Payment Inquiry', 'For payment-related queries, please provide your transaction ID or payment reference number.', 'পেমেন্ট সংক্রান্ত প্রশ্নের জন্য, অনুগ্রহ করে আপনার লেনদেন আইডি বা পেমেন্ট রেফারেন্স নম্বর প্রদান করুন।', 'payment'),
('Thank You', 'Thank you for contacting BRTA. Is there anything else I can help you with?', 'BRTA-তে যোগাযোগ করার জন্য ধন্যবাদ। আমি আপনাকে আর কিছু দিয়ে সাহায্য করতে পারি?', 'general'),
('Working Hours', 'Our live chat support is available from 10 AM to 5 PM, Sunday to Thursday.', 'আমাদের লাইভ চ্যাট সহায়তা রবিবার থেকে বৃহস্পতিবার সকাল ১০টা থেকে বিকাল ৫টা পর্যন্ত উপলব্ধ।', 'general')
ON CONFLICT DO NOTHING;

-- ============================================
-- Auto-cleanup function (delete chats older than 1 day)
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_old_chats()
RETURNS void AS $$
BEGIN
    -- Delete closed chat sessions older than 1 day
    DELETE FROM chat_sessions
    WHERE status = 'closed'
      AND ended_at < NOW() - INTERVAL '1 day';
    
    -- Delete cancelled sessions older than 1 day
    DELETE FROM chat_sessions
    WHERE status = 'cancelled'
      AND created_at < NOW() - INTERVAL '1 day';
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Comments for documentation
-- ============================================
COMMENT ON TABLE chat_sessions IS 'Stores live chat sessions between users and admins';
COMMENT ON TABLE chat_messages IS 'Individual messages in chat sessions';
COMMENT ON TABLE admin_presence IS 'Tracks admin availability and online status';
COMMENT ON TABLE quick_replies IS 'Pre-written message templates for admins';
COMMENT ON TABLE typing_indicators IS 'Real-time typing status';

-- ============================================
-- Grant permissions (adjust as needed)
-- ============================================
-- Note: In production, set up proper Row Level Security (RLS)
-- For now, assuming authenticated users have access

-- ============================================
-- Setup complete!
-- ============================================
-- Next steps:
-- 1. Create Supabase Storage bucket: 'chat-attachments'
-- 2. Set bucket to public for read access
-- 3. Set max file size to 1 MB
-- 4. Allow MIME types: image/jpeg, image/png, image/webp
-- ============================================

