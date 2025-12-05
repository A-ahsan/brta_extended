-- Fix notifications RLS to allow police to view their notifications

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;

-- Recreate with police support
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (
    (recipient_type = 'user' AND auth.uid() = user_id)
    OR
    (recipient_type = 'police' AND auth.uid() = user_id)
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
    (recipient_type = 'police' AND auth.uid() = user_id)
    OR
    (recipient_type = 'admin' AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'police')
    ))
  );

-- Success
DO $$
BEGIN
  RAISE NOTICE '✅ Police can now view their notifications!';
END $$;
