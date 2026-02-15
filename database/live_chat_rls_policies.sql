-- ============================================
-- LIVE CHAT SYSTEM - RLS Policies
-- Row Level Security for chat tables
-- ============================================

-- Enable RLS on all chat tables
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE quick_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE typing_indicators ENABLE ROW LEVEL SECURITY;

-- ============================================
-- DROP existing policies if they exist
-- ============================================
DROP POLICY IF EXISTS "Users can create chat sessions" ON chat_sessions;
DROP POLICY IF EXISTS "Users can view own chat sessions" ON chat_sessions;
DROP POLICY IF EXISTS "Users and admins can update chat sessions" ON chat_sessions;
DROP POLICY IF EXISTS "Admins can view all chat sessions" ON chat_sessions;
DROP POLICY IF EXISTS "Users can send messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can view messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can update messages" ON chat_messages;
DROP POLICY IF EXISTS "Admins can manage presence" ON admin_presence;
DROP POLICY IF EXISTS "Everyone can view admin presence" ON admin_presence;
DROP POLICY IF EXISTS "Admins can manage quick replies" ON quick_replies;
DROP POLICY IF EXISTS "Everyone can view quick replies" ON quick_replies;
DROP POLICY IF EXISTS "Users can manage typing indicators" ON typing_indicators;
DROP POLICY IF EXISTS "Users can view typing indicators" ON typing_indicators;

-- ============================================
-- chat_sessions policies
-- ============================================

-- Users can insert their own chat sessions
CREATE POLICY "Users can create chat sessions"
ON chat_sessions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can view their own chat sessions
CREATE POLICY "Users can view own chat sessions"
ON chat_sessions FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR auth.uid() = admin_id);

-- Users and admins can update their chat sessions
CREATE POLICY "Users and admins can update chat sessions"
ON chat_sessions FOR UPDATE
TO authenticated
USING (auth.uid() = user_id OR auth.uid() = admin_id);

-- Admins can view all chat sessions
CREATE POLICY "Admins can view all chat sessions"
ON chat_sessions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- ============================================
-- chat_messages policies
-- ============================================

-- Users can insert messages in their own sessions
CREATE POLICY "Users can send messages"
ON chat_messages FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM chat_sessions
    WHERE chat_sessions.id = session_id
    AND (chat_sessions.user_id = auth.uid() OR chat_sessions.admin_id = auth.uid())
  )
);

-- Users can view messages in their sessions
CREATE POLICY "Users can view messages"
ON chat_messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM chat_sessions
    WHERE chat_sessions.id = session_id
    AND (chat_sessions.user_id = auth.uid() OR chat_sessions.admin_id = auth.uid())
  )
);

-- Users and admins can update messages (for read status)
CREATE POLICY "Users can update messages"
ON chat_messages FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM chat_sessions
    WHERE chat_sessions.id = session_id
    AND (chat_sessions.user_id = auth.uid() OR chat_sessions.admin_id = auth.uid())
  )
);

-- ============================================
-- admin_presence policies
-- ============================================

-- Admins can manage their own presence
CREATE POLICY "Admins can manage presence"
ON admin_presence FOR ALL
TO authenticated
USING (
  auth.uid() = admin_id AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Everyone can view admin presence
CREATE POLICY "Everyone can view admin presence"
ON admin_presence FOR SELECT
TO authenticated
USING (true);

-- ============================================
-- quick_replies policies
-- ============================================

-- Admins can manage quick replies
CREATE POLICY "Admins can manage quick replies"
ON quick_replies FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Everyone can view active quick replies
CREATE POLICY "Everyone can view quick replies"
ON quick_replies FOR SELECT
TO authenticated
USING (is_active = true);

-- ============================================
-- typing_indicators policies
-- ============================================

-- Users can manage their own typing indicators
CREATE POLICY "Users can manage typing indicators"
ON typing_indicators FOR ALL
TO authenticated
USING (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM chat_sessions
    WHERE chat_sessions.id = session_id
    AND (chat_sessions.user_id = auth.uid() OR chat_sessions.admin_id = auth.uid())
  )
);

-- Users can view typing indicators in their sessions
CREATE POLICY "Users can view typing indicators"
ON typing_indicators FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM chat_sessions
    WHERE chat_sessions.id = session_id
    AND (chat_sessions.user_id = auth.uid() OR chat_sessions.admin_id = auth.uid())
  )
);

-- ============================================
-- Setup complete!
-- ============================================
-- Run this SQL in Supabase SQL Editor to enable RLS policies
-- ============================================
