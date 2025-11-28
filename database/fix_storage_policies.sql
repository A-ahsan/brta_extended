-- Fix Storage Policy Issues - SIMPLE VERSION
-- Run this in Supabase SQL Editor

-- Drop ALL existing storage policies first
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON storage.objects';
    END LOOP;
END $$;

-- Create simple, permissive policies for license-user-photos
CREATE POLICY "license-user-photos: Allow all operations"
ON storage.objects
FOR ALL
TO public
USING (bucket_id = 'license-user-photos')
WITH CHECK (bucket_id = 'license-user-photos');

-- Create simple, permissive policies for license-nid-faces  
CREATE POLICY "license-nid-faces: Allow all operations"
ON storage.objects
FOR ALL
TO public
USING (bucket_id = 'license-nid-faces')
WITH CHECK (bucket_id = 'license-nid-faces');

-- Create simple, permissive policies for question-images
CREATE POLICY "question-images: Allow all operations"
ON storage.objects
FOR ALL
TO public
USING (bucket_id = 'question-images')
WITH CHECK (bucket_id = 'question-images');
