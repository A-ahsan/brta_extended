-- Add phone number column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_phone_number ON profiles(phone_number);

-- Update existing users (you can manually update via Supabase dashboard)
-- Example:
-- UPDATE profiles SET phone_number = '01712345678' WHERE email = 'user@example.com';

COMMENT ON COLUMN profiles.phone_number IS 'User phone number for SMS notifications (format: 01XXXXXXXXX)';
