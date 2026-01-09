-- Add father_name and issuing_authority columns to licenses table
-- This migration is backward compatible and safe

-- Add father_name column (from application data)
ALTER TABLE licenses 
ADD COLUMN IF NOT EXISTS father_name VARCHAR(255);

-- Add issuing_authority column (test center office name where physical exam was taken)
ALTER TABLE licenses 
ADD COLUMN IF NOT EXISTS issuing_authority VARCHAR(255);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_licenses_father_name ON licenses(father_name);

-- Update the comment
COMMENT ON COLUMN licenses.father_name IS 'Father name from license application';
COMMENT ON COLUMN licenses.issuing_authority IS 'Test center office name where physical driving test was completed';
