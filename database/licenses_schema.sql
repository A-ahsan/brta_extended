-- Licenses Table
-- Stores generated driving licenses with QR code support
-- Normalized design with proper relationships
-- NO RLS for easy database management

CREATE TABLE IF NOT EXISTS licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_number VARCHAR(20) UNIQUE NOT NULL,
  application_id UUID REFERENCES license_applications(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- License Details
  license_type VARCHAR(30) CHECK (license_type IN ('Light', 'Motor', 'Light+Motor')) NOT NULL,
  license_category VARCHAR(20) CHECK (license_category IN ('Professional', 'Non-Professional')) NOT NULL,
  
  -- Personal Information (duplicated from application for quick access)
  full_name_en VARCHAR(255) NOT NULL,
  full_name_bn VARCHAR(255) NOT NULL,
  nid_number VARCHAR(20) NOT NULL,
  date_of_birth DATE NOT NULL,
  blood_group VARCHAR(5) NOT NULL,
  gender VARCHAR(10) NOT NULL,
  address TEXT NOT NULL,
  photo_url TEXT NOT NULL,
  
  -- License Validity
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_date DATE NOT NULL,
  expired SMALLINT DEFAULT 0 CHECK (expired IN (0, 1)),
  
  -- Status
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'suspended', 'revoked')) NOT NULL,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_licenses_user_id ON licenses(user_id);
CREATE INDEX IF NOT EXISTS idx_licenses_number ON licenses(license_number);
CREATE INDEX IF NOT EXISTS idx_licenses_application_id ON licenses(application_id);
CREATE INDEX IF NOT EXISTS idx_licenses_nid ON licenses(nid_number);
CREATE INDEX IF NOT EXISTS idx_licenses_status ON licenses(status);
CREATE INDEX IF NOT EXISTS idx_licenses_expiry ON licenses(expiry_date);
CREATE INDEX IF NOT EXISTS idx_licenses_expired ON licenses(expired);

-- Function to generate license number
CREATE OR REPLACE FUNCTION generate_license_number()
RETURNS TEXT AS $$
DECLARE
  year_part TEXT;
  random_part TEXT;
BEGIN
  year_part := TO_CHAR(NOW(), 'YY');
  random_part := LPAD(FLOOR(RANDOM() * 9999999)::TEXT, 7, '0');
  RETURN 'DL' || year_part || random_part;
END;
$$ LANGUAGE plpgsql;

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_licenses_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_licenses_updated_at BEFORE UPDATE ON licenses
    FOR EACH ROW EXECUTE FUNCTION update_licenses_updated_at_column();

-- Function to calculate expiry date based on category
-- Professional: 5 years, Non-Professional: 10 years
CREATE OR REPLACE FUNCTION calculate_license_expiry_date(issue_date DATE, category VARCHAR)
RETURNS DATE AS $$
BEGIN
  IF category = 'Professional' THEN
    RETURN issue_date + INTERVAL '5 years';
  ELSE
    RETURN issue_date + INTERVAL '10 years';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- NO RLS policies for easy database management
-- Comment: RLS disabled as requested for easier management
