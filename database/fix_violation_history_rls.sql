-- Fix violation_history RLS policies to allow trigger updates

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their violation history" ON violation_history;
DROP POLICY IF EXISTS "Police can view all violation history" ON violation_history;
DROP POLICY IF EXISTS "System can manage violation history" ON violation_history;

-- Recreate with proper permissions
CREATE POLICY "Users can view their violation history"
  ON violation_history FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Police can view all violation history"
  ON violation_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('police', 'admin')
    )
  );

-- Allow system to INSERT/UPDATE violation_history (for triggers)
CREATE POLICY "System can manage violation history"
  ON violation_history FOR ALL
  USING (true)
  WITH CHECK (true);

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Violation History RLS Fixed!';
  RAISE NOTICE 'Triggers can now update violation_history automatically.';
END $$;
