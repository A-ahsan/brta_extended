-- Community Reports System
-- Allows registered users to report dalals and submit suggestions
-- Admin can approve/reject/delete reports

-- ====================================
-- COMMUNITY REPORTS TABLE
-- ====================================
CREATE TABLE IF NOT EXISTS community_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Reporter Info
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reporter_name VARCHAR(255) NOT NULL, -- Cached for display
  is_anonymous BOOLEAN DEFAULT false, -- If true, don't show reporter name publicly
  
  -- Report Type
  report_type VARCHAR(20) CHECK (report_type IN ('dalal', 'suggestion')) NOT NULL,
  
  -- Report Content (Bilingual)
  title_en VARCHAR(255) NOT NULL,
  title_bn VARCHAR(255) NOT NULL,
  description_en TEXT NOT NULL,
  description_bn TEXT NOT NULL,
  
  -- Location (Optional for dalal reports)
  location_en VARCHAR(255),
  location_bn VARCHAR(255),
  incident_date DATE, -- When the incident happened
  
  -- Status & Moderation
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')) NOT NULL,
  rejection_reason TEXT, -- Admin can provide reason for rejection
  admin_response_en TEXT, -- Admin's public response to suggestion
  admin_response_bn TEXT,
  
  -- Visibility
  is_published BOOLEAN DEFAULT false, -- Only published reports are visible to public
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  published_at TIMESTAMP WITH TIME ZONE, -- When admin approved
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Which admin reviewed
  reviewed_at TIMESTAMP WITH TIME ZONE
);

-- ====================================
-- REPORT ATTACHMENTS TABLE
-- ====================================
CREATE TABLE IF NOT EXISTS report_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES community_reports(id) ON DELETE CASCADE NOT NULL,
  
  -- File Info
  file_url TEXT NOT NULL, -- Supabase storage URL
  file_type VARCHAR(10) CHECK (file_type IN ('image', 'video')) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_size INTEGER, -- in bytes
  
  -- Order for display
  display_order INTEGER DEFAULT 0,
  
  -- Timestamps
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ====================================
-- INDEXES FOR PERFORMANCE
-- ====================================
CREATE INDEX IF NOT EXISTS idx_community_reports_user_id ON community_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_community_reports_type ON community_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_community_reports_status ON community_reports(status);
CREATE INDEX IF NOT EXISTS idx_community_reports_published ON community_reports(is_published);
CREATE INDEX IF NOT EXISTS idx_community_reports_created ON community_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_report_attachments_report_id ON report_attachments(report_id);

-- ====================================
-- UPDATED_AT TRIGGER
-- ====================================
CREATE OR REPLACE FUNCTION update_community_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_community_reports_updated_at_trigger
BEFORE UPDATE ON community_reports
FOR EACH ROW EXECUTE FUNCTION update_community_reports_updated_at();

-- ====================================
-- HELPER FUNCTIONS
-- ====================================

-- Function to get public reports (approved and published)
CREATE OR REPLACE FUNCTION get_public_reports(
  p_report_type VARCHAR DEFAULT NULL,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  reporter_name VARCHAR,
  is_anonymous BOOLEAN,
  report_type VARCHAR,
  title_en VARCHAR,
  title_bn VARCHAR,
  description_en TEXT,
  description_bn TEXT,
  location_en VARCHAR,
  location_bn VARCHAR,
  incident_date DATE,
  admin_response_en TEXT,
  admin_response_bn TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  published_at TIMESTAMP WITH TIME ZONE,
  attachment_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cr.id,
    cr.user_id,
    CASE 
      WHEN cr.is_anonymous THEN 'Anonymous'::VARCHAR
      ELSE cr.reporter_name 
    END AS reporter_name,
    cr.is_anonymous,
    cr.report_type,
    cr.title_en,
    cr.title_bn,
    cr.description_en,
    cr.description_bn,
    cr.location_en,
    cr.location_bn,
    cr.incident_date,
    cr.admin_response_en,
    cr.admin_response_bn,
    cr.created_at,
    cr.published_at,
    (SELECT COUNT(*) FROM report_attachments WHERE report_id = cr.id) AS attachment_count
  FROM community_reports cr
  WHERE cr.is_published = true 
    AND cr.status = 'approved'
    AND (p_report_type IS NULL OR cr.report_type = p_report_type)
  ORDER BY cr.published_at DESC NULLS LAST, cr.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Function to get user's own reports (all statuses)
CREATE OR REPLACE FUNCTION get_user_reports(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  report_type VARCHAR,
  title_en VARCHAR,
  title_bn VARCHAR,
  status VARCHAR,
  is_published BOOLEAN,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  attachment_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cr.id,
    cr.report_type,
    cr.title_en,
    cr.title_bn,
    cr.status,
    cr.is_published,
    cr.rejection_reason,
    cr.created_at,
    cr.updated_at,
    (SELECT COUNT(*) FROM report_attachments WHERE report_id = cr.id) AS attachment_count
  FROM community_reports cr
  WHERE cr.user_id = p_user_id
  ORDER BY cr.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- ====================================
-- RLS POLICIES (DISABLED FOR EASY MANAGEMENT)
-- ====================================
-- Note: No RLS policies, following project pattern for easy database management

-- ====================================
-- STORAGE BUCKET FOR REPORT ATTACHMENTS
-- ====================================
-- Run this in Supabase SQL editor to create storage bucket:
-- 
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('community-reports', 'community-reports', true)
-- ON CONFLICT (id) DO NOTHING;
--
-- CREATE POLICY "Anyone can view report images" ON storage.objects
--   FOR SELECT USING (bucket_id = 'community-reports');
--
-- CREATE POLICY "Authenticated users can upload report images" ON storage.objects
--   FOR INSERT WITH CHECK (
--     bucket_id = 'community-reports' AND 
--     auth.role() = 'authenticated'
--   );
--
-- CREATE POLICY "Users can delete their own report images" ON storage.objects
--   FOR DELETE USING (
--     bucket_id = 'community-reports' AND 
--     auth.uid() = owner
--   );

COMMENT ON TABLE community_reports IS 'Stores community reports for dalals and improvement suggestions';
COMMENT ON TABLE report_attachments IS 'Stores image/video attachments for community reports';
