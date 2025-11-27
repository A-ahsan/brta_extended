-- License Applications Table
-- Stores all driving license application data with full tracking
-- NO RLS policies for easy database management

CREATE TABLE IF NOT EXISTS license_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_number VARCHAR(20) UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Application Type
  license_type VARCHAR(30) CHECK (license_type IN ('Light', 'Motor', 'Light+Motor')) NOT NULL,
  license_category VARCHAR(20) CHECK (license_category IN ('Professional', 'Non-Professional')) NOT NULL,
  
  -- NID Information (from mock server)
  nid_number VARCHAR(20) NOT NULL,
  full_name_en VARCHAR(255) NOT NULL,
  full_name_bn VARCHAR(255) NOT NULL,
  father_name VARCHAR(255) NOT NULL,
  mother_name VARCHAR(255) NOT NULL,
  date_of_birth DATE NOT NULL,
  gender VARCHAR(10) NOT NULL,
  blood_group VARCHAR(5) NOT NULL,
  division VARCHAR(100) NOT NULL,
  district VARCHAR(100) NOT NULL,
  upazila VARCHAR(100) NOT NULL,
  address TEXT NOT NULL,
  
  -- Images (NO full NID image stored for privacy)
  nid_face_extracted_url TEXT NOT NULL,
  user_photo_url TEXT NOT NULL,
  
  -- Application Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'nid_verified', 'face_verified', 'online_exam_pending', 'online_exam_passed', 'physical_exam_pending', 'physical_exam_passed', 'payment_pending', 'payment_completed', 'approved', 'rejected')) NOT NULL,
  
  -- Step Completion Flags (0 = not done, 1 = done)
  online_exam SMALLINT DEFAULT 0 CHECK (online_exam IN (0, 1)),
  physical_exam SMALLINT DEFAULT 0 CHECK (physical_exam IN (0, 1)),
  face_verification SMALLINT DEFAULT 0 CHECK (face_verification IN (0, 1)),
  payment SMALLINT DEFAULT 0 CHECK (payment IN (0, 1)),
  
  -- Tracking
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  nid_verified_at TIMESTAMP WITH TIME ZONE,
  face_verified_at TIMESTAMP WITH TIME ZONE,
  online_exam_completed_at TIMESTAMP WITH TIME ZONE,
  physical_exam_completed_at TIMESTAMP WITH TIME ZONE,
  payment_completed_at TIMESTAMP WITH TIME ZONE,
  approved_at TIMESTAMP WITH TIME ZONE,
  rejected_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_license_app_user_id ON license_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_license_app_number ON license_applications(application_number);
CREATE INDEX IF NOT EXISTS idx_license_app_status ON license_applications(status);
CREATE INDEX IF NOT EXISTS idx_license_app_nid ON license_applications(nid_number);
CREATE INDEX IF NOT EXISTS idx_license_app_submitted ON license_applications(submitted_at);

-- Function to generate application number
CREATE OR REPLACE FUNCTION generate_application_number()
RETURNS TEXT AS $$
DECLARE
  year_part TEXT;
  random_part TEXT;
BEGIN
  year_part := TO_CHAR(NOW(), 'YYYY');
  random_part := LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');
  RETURN 'DL' || year_part || random_part;
END;
$$ LANGUAGE plpgsql;

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_license_app_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_license_applications_updated_at BEFORE UPDATE ON license_applications
    FOR EACH ROW EXECUTE FUNCTION update_license_app_updated_at_column();

-- NOTE: NO RLS policies for easy management
