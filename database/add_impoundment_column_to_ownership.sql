-- Add has_impoundment column to ownership_transfer_applications table
-- Execute this in Supabase SQL Editor BEFORE updating the function

-- Add the column if it doesn't exist
ALTER TABLE ownership_transfer_applications 
ADD COLUMN IF NOT EXISTS has_impoundment BOOLEAN DEFAULT FALSE;

-- Verify the column was added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'ownership_transfer_applications' 
AND column_name = 'has_impoundment';
