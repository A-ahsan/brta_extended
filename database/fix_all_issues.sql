-- Complete Fix for All Issues
-- Run this entire script in Supabase SQL Editor

-- ============================================
-- 1. FIX STORAGE POLICIES (Clean slate approach)
-- ============================================

-- Drop ALL existing storage policies completely
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Get all policies on storage.objects table
    FOR r IN (
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'storage' AND tablename = 'objects'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', r.policyname);
        RAISE NOTICE 'Dropped policy: %', r.policyname;
    END LOOP;
END $$;

-- Wait a moment for policies to clear
SELECT pg_sleep(1);

-- Create ONLY 3 simple, permissive policies (one per bucket)
CREATE POLICY "license-user-photos-all"
ON storage.objects
FOR ALL
TO public
USING (bucket_id = 'license-user-photos')
WITH CHECK (bucket_id = 'license-user-photos');

CREATE POLICY "license-nid-faces-all"
ON storage.objects
FOR ALL
TO public
USING (bucket_id = 'license-nid-faces')
WITH CHECK (bucket_id = 'license-nid-faces');

CREATE POLICY "question-images-all"
ON storage.objects
FOR ALL
TO public
USING (bucket_id = 'question-images')
WITH CHECK (bucket_id = 'question-images');

-- ============================================
-- 2. ENSURE NOTIFICATION FUNCTION EXISTS
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
-- 3. VERIFY NOTIFICATIONS TABLE EXISTS
-- ============================================

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'notifications') THEN
        CREATE TABLE notifications (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
            recipient_type VARCHAR(10) CHECK (recipient_type IN ('user', 'admin')),
            title_en VARCHAR(255) NOT NULL,
            title_bn VARCHAR(255) NOT NULL,
            message_en TEXT NOT NULL,
            message_bn TEXT NOT NULL,
            notification_type VARCHAR(50),
            application_id UUID,
            action_url TEXT,
            is_read BOOLEAN DEFAULT false,
            created_at TIMESTAMPTZ DEFAULT now(),
            read_at TIMESTAMPTZ
        );

        -- Create index for faster queries
        CREATE INDEX idx_notifications_user_id ON notifications(user_id);
        CREATE INDEX idx_notifications_recipient_type ON notifications(recipient_type);
        CREATE INDEX idx_notifications_is_read ON notifications(is_read);
        
        -- Enable RLS
        ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
        
        -- RLS Policies
        CREATE POLICY "Users can view their own notifications"
            ON notifications FOR SELECT
            USING (
                (recipient_type = 'user' AND auth.uid() = user_id)
                OR
                (recipient_type = 'admin' AND EXISTS (
                    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'police')
                ))
            );
        
        CREATE POLICY "Users can update their own notifications"
            ON notifications FOR UPDATE
            USING (
                (recipient_type = 'user' AND auth.uid() = user_id)
                OR
                (recipient_type = 'admin' AND EXISTS (
                    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'police')
                ))
            );
    END IF;
END $$;

-- ============================================
-- 4. TEST QUERY - Verify everything works
-- ============================================

-- Check storage policies (Should show EXACTLY 3 policies)
SELECT 
    policyname as "Policy Name",
    cmd as "Command Type",
    qual as "USING clause"
FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage'
ORDER BY policyname;

-- Expected result: 3 rows
-- 1. license-nid-faces-all
-- 2. license-user-photos-all  
-- 3. question-images-all

-- Check if notification function exists
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public' 
AND routine_name = 'create_dual_notification';

-- Check if notifications table exists
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public' 
AND table_name = 'notifications';
