-- =====================================================
-- ADD NEW OWNER PHOTO TO OWNERSHIP TRANSFER APPLICATIONS
-- =====================================================

-- Add column for new owner's photo (from license)
ALTER TABLE ownership_transfer_applications
ADD COLUMN IF NOT EXISTS new_owner_photo_url TEXT;

-- Add comment
COMMENT ON COLUMN ownership_transfer_applications.new_owner_photo_url IS 'Photo URL of new owner from their driving license';

-- Verify column was added
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'ownership_transfer_applications'
AND column_name = 'new_owner_photo_url';

DO $$
BEGIN
  RAISE NOTICE '✅ New owner photo column added successfully!';
  RAISE NOTICE '📸 Column: new_owner_photo_url (TEXT, nullable)';
  RAISE NOTICE '🔄 Photo will be auto-fetched from license when DL number is searched';
END $$;
