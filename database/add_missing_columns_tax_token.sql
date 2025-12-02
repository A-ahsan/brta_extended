-- Quick fix: Add missing columns to existing tax_token_renewals table
-- Run this if the table already exists but is missing columns

-- Add missing columns
ALTER TABLE tax_token_renewals 
ADD COLUMN IF NOT EXISTS old_expiry_date DATE,
ADD COLUMN IF NOT EXISTS new_expiry_date DATE;

-- Make them NOT NULL with a default for existing rows
UPDATE tax_token_renewals 
SET 
  old_expiry_date = COALESCE(old_expiry_date, CURRENT_DATE),
  new_expiry_date = COALESCE(new_expiry_date, CURRENT_DATE + INTERVAL '365 days')
WHERE old_expiry_date IS NULL OR new_expiry_date IS NULL;

-- Now make them NOT NULL
ALTER TABLE tax_token_renewals 
ALTER COLUMN old_expiry_date SET NOT NULL,
ALTER COLUMN new_expiry_date SET NOT NULL;

-- Verify
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'tax_token_renewals'
ORDER BY ordinal_position;
