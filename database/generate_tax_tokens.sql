-- Generate Tax Tokens for All Registered Vehicles
-- This script creates tax token records for existing vehicles

-- Function to generate tax token number
CREATE OR REPLACE FUNCTION generate_tax_token_number()
RETURNS TEXT AS $$
DECLARE
  year_part TEXT;
  random_part TEXT;
BEGIN
  year_part := TO_CHAR(NOW(), 'YYYY');
  random_part := LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');
  RETURN 'TT-' || year_part || '-' || random_part;
END;
$$ LANGUAGE plpgsql;

-- Insert tax tokens for all registered vehicles that don't have one
INSERT INTO tax_tokens (
  token_number,
  registered_vehicle_id,
  user_id,
  issue_date,
  valid_until,
  tax_year,
  amount_paid,
  status
)
SELECT
  generate_tax_token_number(),
  rv.id,
  rv.user_id,
  rv.registration_date,
  rv.valid_until,
  EXTRACT(YEAR FROM rv.registration_date)::VARCHAR,
  5000.00, -- Fixed tax amount
  CASE 
    WHEN rv.valid_until > CURRENT_DATE THEN 'active'
    ELSE 'expired'
  END
FROM registered_vehicles rv
WHERE NOT EXISTS (
  SELECT 1 FROM tax_tokens tt 
  WHERE tt.registered_vehicle_id = rv.id 
  AND tt.tax_year = EXTRACT(YEAR FROM rv.registration_date)::VARCHAR
)
ON CONFLICT (token_number) DO NOTHING;

-- Create index if not exists
CREATE INDEX IF NOT EXISTS idx_tax_tokens_vehicle_id ON tax_tokens(registered_vehicle_id);
CREATE INDEX IF NOT EXISTS idx_tax_tokens_user_id ON tax_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_tax_tokens_token_number ON tax_tokens(token_number);
CREATE INDEX IF NOT EXISTS idx_tax_tokens_status ON tax_tokens(status);

-- Enable RLS if not enabled
ALTER TABLE tax_tokens ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their own tax tokens" ON tax_tokens;
DROP POLICY IF EXISTS "Admins can view all tax tokens" ON tax_tokens;
DROP POLICY IF EXISTS "Police can view all tax tokens" ON tax_tokens;

-- Create RLS policies
CREATE POLICY "Users can view their own tax tokens"
  ON tax_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all tax tokens"
  ON tax_tokens FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Police can view all tax tokens"
  ON tax_tokens FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'police'
    )
  );

-- Verify created tax tokens
SELECT 
  COUNT(*) as total_tax_tokens,
  COUNT(CASE WHEN status = 'active' THEN 1 END) as active_tokens,
  COUNT(CASE WHEN status = 'expired' THEN 1 END) as expired_tokens
FROM tax_tokens;

-- Show sample tax tokens
SELECT 
  tt.token_number,
  rv.registration_number,
  rv.vehicle_name,
  rv.model,
  tt.tax_year,
  tt.amount_paid,
  tt.status,
  tt.valid_until
FROM tax_tokens tt
JOIN registered_vehicles rv ON tt.registered_vehicle_id = rv.id
LIMIT 10;
