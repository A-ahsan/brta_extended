-- Add face verification fields to license_applications table
-- Run this in your Supabase SQL Editor

ALTER TABLE license_applications
ADD COLUMN IF NOT EXISTS live_face_url TEXT,
ADD COLUMN IF NOT EXISTS face_match_score DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS face_verified_at TIMESTAMP WITH TIME ZONE;

-- Create storage bucket for live face captures
-- Note: Run this in SQL Editor or create bucket manually in Supabase Storage
INSERT INTO storage.buckets (id, name, public)
VALUES ('license-live-faces', 'license-live-faces', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for license-live-faces bucket
CREATE POLICY "Allow authenticated uploads to license-live-faces"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'license-live-faces');

CREATE POLICY "Allow public read from license-live-faces"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'license-live-faces');

CREATE POLICY "Allow users to update their own files in license-live-faces"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'license-live-faces' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Allow users to delete their own files in license-live-faces"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'license-live-faces' AND auth.uid()::text = (storage.foldername(name))[1]);
