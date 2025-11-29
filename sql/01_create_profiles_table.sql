-- =====================================================
-- BRTA 2.0 - Profiles Table Creation
-- =====================================================
-- This creates the profiles table to store user information and roles
-- Run this SQL in Supabase SQL Editor

-- Create profiles table for user roles and additional info
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'police', 'vehicle_adder')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS profiles_email_idx ON profiles(email);
CREATE INDEX IF NOT EXISTS profiles_role_idx ON profiles(role);

-- =====================================================
-- UPDATE EXISTING TABLE (Run this if table already exists)
-- =====================================================
-- Drop old constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Add new constraint with vehicle_adder
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('user', 'admin', 'police', 'vehicle_adder'));
