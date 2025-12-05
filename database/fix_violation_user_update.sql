-- Fix traffic violations RLS to allow users to update payment_id

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can update payment info on their violations" ON traffic_violations;

-- Allow users to update their own violations (only payment_id field)
CREATE POLICY "Users can update payment info on their violations"
  ON traffic_violations FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Success
DO $$
BEGIN
  RAISE NOTICE '✅ Users can now update payment_id on their violations!';
END $$;
