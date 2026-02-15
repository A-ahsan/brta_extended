-- ============================================
-- FIX LIVE CHAT RLS POLICIES
-- Run this in Supabase SQL Editor to fix admin accept chat issue
-- ============================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can create their own chat sessions" ON chat_sessions;
DROP POLICY IF EXISTS "Users can view their own chat sessions" ON chat_sessions;
DROP POLICY IF EXISTS "Admins can view all chat sessions" ON chat_sessions;
DROP POLICY IF EXISTS "Admins can update chat sessions" ON chat_sessions;
DROP POLICY IF EXISTS "Users can view their own messages" ON chat_messages;
DROP POLICY IF EXISTS "Admins can view all messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can insert their own messages" ON chat_messages;
DROP POLICY IF EXISTS "Admins can insert messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON chat_messages;
DROP POLICY IF EXISTS "Admins can manage admin presence" ON admin_presence;
DROP POLICY IF EXISTS "Everyone can view quick replies" ON quick_replies;
DROP POLICY IF EXISTS "Admins can manage quick replies" ON quick_replies;
DROP POLICY IF EXISTS "Users can manage their typing status" ON typing_indicators;
DROP POLICY IF EXISTS "Admins can manage typing status" ON typing_indicators;

-- Enable RLS on all tables
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE quick_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE typing_indicators ENABLE ROW LEVEL SECURITY;

-- ============================================
-- chat_sessions policies
-- ============================================

-- Users can create their own chat sessions
CREATE POLICY "Users can create their own chat sessions"
ON chat_sessions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can view their own chat sessions
CREATE POLICY "Users can view their own chat sessions"
ON chat_sessions FOR SELECT
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

-- Admins can update chat sessions (accept, close, etc.)
CREATE POLICY "Admins can update chat sessions"
ON chat_sessions FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Users can update their own sessions (for closing, rating)
CREATE POLICY "Users can update their own sessions"
ON chat_sessions FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ============================================
-- chat_messages policies
-- ============================================

-- Users can view messages in their chat sessions
CREATE POLICY "Users can view their own messages"
ON chat_messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM chat_sessions
    WHERE chat_sessions.id = chat_messages.session_id
    AND (chat_sessions.user_id = auth.uid() OR chat_sessions.admin_id = auth.uid())
  )
);

-- Admins can view all messages
CREATE POLICY "Admins can view all messages"
ON chat_messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Users can insert messages in their own sessions
CREATE POLICY "Users can insert their own messages"
ON chat_messages FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM chat_sessions
    WHERE chat_sessions.id = chat_messages.session_id
    AND chat_sessions.user_id = auth.uid()
  )
);

-- Admins can insert messages in any session
CREATE POLICY "Admins can insert messages"
ON chat_messages FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Users can update their own messages (mark as read)
CREATE POLICY "Users can update their own messages"
ON chat_messages FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM chat_sessions
    WHERE chat_sessions.id = chat_messages.session_id
    AND (chat_sessions.user_id = auth.uid() OR chat_sessions.admin_id = auth.uid())
  )
);

-- ============================================
-- admin_presence policies
-- ============================================

-- Admins can manage their presence
CREATE POLICY "Admins can manage admin presence"
ON admin_presence FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Everyone can view admin presence (to check availability)
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
)
WITH CHECK (
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

-- Users can manage their own typing status
CREATE POLICY "Users can manage their typing status"
ON typing_indicators FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Admins can manage typing status
CREATE POLICY "Admins can manage typing status"
ON typing_indicators FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- ============================================
-- Verification
-- ============================================

-- Check if policies were created successfully
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('chat_sessions', 'chat_messages', 'admin_presence', 'quick_replies', 'typing_indicators')
ORDER BY tablename, policyname;

-- Done! Now admins can accept chats
