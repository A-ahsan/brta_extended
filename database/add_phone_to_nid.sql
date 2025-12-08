-- Add phone number to NID mock server table
ALTER TABLE nid_mock_server ADD COLUMN IF NOT EXISTS phone_number VARCHAR(15);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_nid_phone_number ON nid_mock_server(phone_number);

-- Update existing records with sample phone numbers (without 88 prefix)
-- Format: 01XXXXXXXXX (11 digits starting with 01)
UPDATE nid_mock_server SET phone_number = '01712345678' WHERE nid_number = '1234567890123' AND phone_number IS NULL;
UPDATE nid_mock_server SET phone_number = '01812345679' WHERE nid_number = '9876543210987' AND phone_number IS NULL;
UPDATE nid_mock_server SET phone_number = '01912345680' WHERE nid_number = '1111222233334' AND phone_number IS NULL;
UPDATE nid_mock_server SET phone_number = '01612345681' WHERE nid_number = '5555666677778' AND phone_number IS NULL;

COMMENT ON COLUMN nid_mock_server.phone_number IS 'Mobile number without country code (format: 01XXXXXXXXX)';
