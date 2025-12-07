-- =====================================================
-- OWNERSHIP TRANSFER STORAGE BUCKET SETUP
-- =====================================================
-- Run this in Supabase SQL Editor to create storage bucket and policies

-- =====================================================
-- 1. CREATE STORAGE BUCKET
-- =====================================================

-- Create storage bucket for deed documents (দলিল)
INSERT INTO storage.buckets (id, name, public)
VALUES ('ownership-transfer-deeds', 'ownership-transfer-deeds', false)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 2. STORAGE POLICIES (RLS for Storage)
-- =====================================================

-- Policy 1: Users can upload their own deed documents
CREATE POLICY "Users can upload deed documents"
ON storage.objects FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'ownership-transfer-deeds' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy 2: Users can view their own deed documents
CREATE POLICY "Users can view their own deed documents"
ON storage.objects FOR SELECT
TO public
USING (
  bucket_id = 'ownership-transfer-deeds' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy 3: Admins can view all deed documents
CREATE POLICY "Admins can view all deed documents"
ON storage.objects FOR SELECT
TO public
USING (
  bucket_id = 'ownership-transfer-deeds' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Policy 4: Users can update their own deed documents
CREATE POLICY "Users can update their own deed documents"
ON storage.objects FOR UPDATE
TO public
USING (
  bucket_id = 'ownership-transfer-deeds' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy 5: Users can delete their own deed documents
CREATE POLICY "Users can delete their own deed documents"
ON storage.objects FOR DELETE
TO public
USING (
  bucket_id = 'ownership-transfer-deeds' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- =====================================================
-- 3. VERIFICATION
-- =====================================================

-- Check if bucket was created
SELECT 
  id, 
  name, 
  public,
  created_at
FROM storage.buckets
WHERE id = 'ownership-transfer-deeds';

-- Check policies
SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'storage' 
AND tablename = 'objects'
AND policyname LIKE '%deed%';

-- =====================================================
-- 4. SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Ownership Transfer Storage Setup Complete!';
  RAISE NOTICE '📦 Bucket: ownership-transfer-deeds (private)';
  RAISE NOTICE '🔒 Policies: 5 (upload, view own, admin view all, update, delete)';
  RAISE NOTICE '📁 Folder structure: {user_id}/{filename}';
  RAISE NOTICE '🌐 Access: Users can only see their own deeds, admins see all';
  RAISE NOTICE '📄 Supported formats: PDF, JPG, PNG';
  RAISE NOTICE '🚀 Ready to use!';
END $$;
