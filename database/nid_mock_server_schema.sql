-- Mock NID Server Database Schema
-- This table stores mock National ID information for verification purposes
-- NO RLS policies for easy database editing and testing

CREATE TABLE IF NOT EXISTS nid_mock_server (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nid_number VARCHAR(20) UNIQUE NOT NULL,
  full_name_en VARCHAR(255) NOT NULL,
  full_name_bn VARCHAR(255) NOT NULL,
  father_name VARCHAR(255) NOT NULL,
  mother_name VARCHAR(255) NOT NULL,
  date_of_birth DATE NOT NULL,
  gender VARCHAR(10) CHECK (gender IN ('Male', 'Female', 'Other')) NOT NULL,
  blood_group VARCHAR(5) CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')) NOT NULL,
  division VARCHAR(100) NOT NULL,
  district VARCHAR(100) NOT NULL,
  upazila VARCHAR(100) NOT NULL,
  address TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for faster NID lookups
CREATE INDEX IF NOT EXISTS idx_nid_number ON nid_mock_server(nid_number);
CREATE INDEX IF NOT EXISTS idx_nid_full_name_en ON nid_mock_server(full_name_en);
CREATE INDEX IF NOT EXISTS idx_nid_date_of_birth ON nid_mock_server(date_of_birth);
CREATE INDEX IF NOT EXISTS idx_nid_district ON nid_mock_server(district);
CREATE INDEX IF NOT EXISTS idx_nid_active ON nid_mock_server(is_active);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_nid_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_nid_mock_server_updated_at BEFORE UPDATE ON nid_mock_server
    FOR EACH ROW EXECUTE FUNCTION update_nid_updated_at_column();

-- NOTE: NO RLS policies are applied to this table for easy database editing and testing
-- This is a mock server for development/testing purposes only
