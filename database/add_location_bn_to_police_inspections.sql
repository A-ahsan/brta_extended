-- Add location_bn column to police_inspections table for bilingual location support

-- Add the location_bn column
ALTER TABLE police_inspections 
ADD COLUMN IF NOT EXISTS location_bn TEXT;

-- Add comment to the column
COMMENT ON COLUMN police_inspections.location_bn IS 'Location in Bengali for bilingual support';
