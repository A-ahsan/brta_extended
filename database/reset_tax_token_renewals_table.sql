-- Complete reset of tax_token_renewals table
-- Use this if you want to start fresh (WARNING: deletes all existing renewal records)

-- Drop existing table
DROP TABLE IF EXISTS tax_token_renewals CASCADE;

-- Recreate with correct structure
CREATE TABLE tax_token_renewals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID REFERENCES registered_vehicles(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  payment_id UUID REFERENCES payments(id) ON DELETE CASCADE NOT NULL,
  renewal_number VARCHAR(20) UNIQUE NOT NULL,
  renewal_days INTEGER NOT NULL,
  amount_paid NUMERIC(10,2) NOT NULL,
  old_expiry_date DATE NOT NULL,
  new_expiry_date DATE NOT NULL,
  status VARCHAR(20) CHECK (status IN ('active', 'cancelled')) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_tax_token_renewals_vehicle_id ON tax_token_renewals(vehicle_id);
CREATE INDEX idx_tax_token_renewals_user_id ON tax_token_renewals(user_id);
CREATE INDEX idx_tax_token_renewals_payment_id ON tax_token_renewals(payment_id);

-- Enable RLS
ALTER TABLE tax_token_renewals ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Users can view their own tax token renewals" ON tax_token_renewals;
CREATE POLICY "Users can view their own tax token renewals"
ON tax_token_renewals FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage tax token renewals" ON tax_token_renewals;
CREATE POLICY "Service role can manage tax token renewals"
ON tax_token_renewals FOR ALL
USING (true);

-- Verify
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'tax_token_renewals'
ORDER BY ordinal_position;

SELECT 'Tax token renewals table recreated successfully!' AS status;
