-- =====================================================
-- ADD OWNER PHOTO URL COLUMN TO REGISTERED VEHICLES
-- =====================================================

-- Add the column if it doesn't exist
ALTER TABLE registered_vehicles 
ADD COLUMN IF NOT EXISTS owner_photo_url TEXT;

-- Verify it was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'registered_vehicles' 
AND column_name = 'owner_photo_url';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ owner_photo_url column added to registered_vehicles table!';
  RAISE NOTICE '📸 Ownership transfers will now update vehicle owner photos';
END $$;
