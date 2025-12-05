-- Allow police and public to view violations when verifying vehicles

-- Allow anyone (including public/unauthenticated) to view violation records
-- This is needed for public vehicle verification and police scanning
CREATE POLICY "Anyone can view violations for verification"
  ON traffic_violations FOR SELECT
  USING (true);

-- Success
DO $$
BEGIN
  RAISE NOTICE '✅ Public and Police can now view violations during vehicle verification!';
END $$;
