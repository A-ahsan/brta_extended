-- Storage Bucket Policies for License Applications
-- Run this after creating the storage buckets

-- Create buckets first in Supabase UI:
-- 1. license-user-photos (for user photos)
-- 2. license-nid-faces (for extracted NID face images)
-- NOTE: We do NOT store full NID images for privacy/security

-- Policies for license-user-photos bucket
CREATE POLICY "Allow authenticated users to upload photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'license-user-photos');

CREATE POLICY "Allow public to view user photos"
ON storage.objects
FOR SELECT
TO public, authenticated
USING (bucket_id = 'license-user-photos');

CREATE POLICY "Allow users to update their photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'license-user-photos');

CREATE POLICY "Allow users to delete their photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'license-user-photos');

-- Policies for license-nid-faces bucket
CREATE POLICY "Allow authenticated users to upload NID face extractions"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'license-nid-faces');

CREATE POLICY "Allow public to view NID faces"
ON storage.objects
FOR SELECT
TO public, authenticated
USING (bucket_id = 'license-nid-faces');

CREATE POLICY "Allow system to update NID faces"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'license-nid-faces');

CREATE POLICY "Allow system to delete NID faces"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'license-nid-faces');
