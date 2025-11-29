-- Add license_generated column to license_applications table
-- Run this in your Supabase SQL Editor

-- Add the license_generated flag column (default 0)
ALTER TABLE license_applications 
ADD COLUMN IF NOT EXISTS license_generated INTEGER DEFAULT 0 CHECK (license_generated IN (0, 1));

-- Add timestamp for when license was generated
ALTER TABLE license_applications 
ADD COLUMN IF NOT EXISTS license_generated_at TIMESTAMPTZ;

-- Create an index for faster queries
CREATE INDEX IF NOT EXISTS idx_license_applications_license_generated 
ON license_applications(license_generated);

-- Verify the columns were added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'license_applications' 
AND column_name IN ('license_generated', 'license_generated_at');
