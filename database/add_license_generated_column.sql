-- Add license_generated column to license_applications table
-- Run this in your Supabase SQL Editor

-- Add the license_generated flag column (default 0)
ALTER TABLE license_applications 
ADD COLUMN IF NOT EXISTS license_generated SMALLINT DEFAULT 0 CHECK (license_generated IN (0, 1));

-- Add timestamp for when license was generated
ALTER TABLE license_applications 
ADD COLUMN IF NOT EXISTS license_generated_at TIMESTAMPTZ;

-- Create an index for faster queries
CREATE INDEX IF NOT EXISTS idx_license_applications_license_generated 
ON license_applications(license_generated);

-- Update trigger to automatically set license_generated when a license is created
CREATE OR REPLACE FUNCTION update_application_license_generated()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the application to mark license as generated
  UPDATE license_applications 
  SET 
    license_generated = 1,
    license_generated_at = NOW()
  WHERE id = NEW.application_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on licenses table
DROP TRIGGER IF EXISTS trigger_update_application_license_generated ON licenses;
CREATE TRIGGER trigger_update_application_license_generated
AFTER INSERT ON licenses
FOR EACH ROW
EXECUTE FUNCTION update_application_license_generated();

-- Verify the columns were added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'license_applications' 
AND column_name IN ('license_generated', 'license_generated_at');
