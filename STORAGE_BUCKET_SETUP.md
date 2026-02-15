# 📦 Storage Bucket Setup for Image Upload

## ⚠️ Current Issue
You created `chat-attachments` bucket but getting **400 Bad Request** errors. This means the policies need to be updated.

---

## 🔧 Fix Storage Policies

### Step 1: Go to Storage Policies
1. Open [Supabase Dashboard](https://supabase.com/dashboard)
2. Go to **Storage** → Click on `chat-attachments` bucket
3. Click **Policies** tab
4. **Delete all existing policies** (if any)

### Step 2: Add Correct Policies via SQL

Go to **SQL Editor** and run this:

```sql
-- Policy 1: Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload chat images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-attachments'
  AND auth.role() = 'authenticated'
);

-- Policy 2: Allow everyone to read images (public access)
CREATE POLICY "Anyone can view chat images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'chat-attachments');

-- Policy 3: Allow users to update their own uploads
CREATE POLICY "Users can update own uploads"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'chat-attachments' AND auth.uid()::text = owner::text);

-- Policy 4: Allow users to delete their own uploads
CREATE POLICY "Users can delete own uploads"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'chat-attachments' AND auth.uid()::text = owner::text);
```

### Step 3: Verify Bucket Settings

Make sure your `chat-attachments` bucket has these settings:
- ✅ **Public bucket**: YES (checked)
- ✅ **File size limit**: 10 MB
- ✅ **Allowed MIME types**: `image/jpeg, image/jpg, image/png, image/webp`

To check/update:
1. Storage → `chat-attachments` → ⚙️ Settings icon
2. Enable "Public bucket" if not already
3. Set file size limit to 10 MB

---

## 🧪 Test After Setup

1. Clear browser cache (Ctrl+Shift+Del)
2. Refresh your app
3. Start a live chat
4. Click image icon
5. Select an image
6. Click upload

**Expected result:** Image uploads successfully! ✅

---

## 🐛 If Still Not Working

### Check Browser Console
Look for specific error messages:
- **"Policy violation"** → Policies not applied correctly
- **"Bucket not found"** → Bucket name mismatch
- **"File too large"** → Image over 10MB limit
- **"Invalid token"** → User not authenticated

### Verify Bucket Name
In Supabase Storage, the bucket MUST be exactly: `chat-attachments` (no spaces, lowercase)

### Test Direct Upload
Try this in browser console:
```javascript
const { data, error } = await window.supabase.storage
  .from('chat-attachments')
  .upload('test.jpg', new Blob(['hello']), {
    contentType: 'image/jpeg'
  });
console.log({ data, error });
```

If this works, the bucket is fine. If not, check policies again.

---

## ✅ What Was Changed in Code

### 1. Simplified Upload Path
**Before:** `${sessionId}/filename.jpg` (nested folders)  
**After:** `filename.jpg` (root level)

**Why:** Simpler path = fewer permission issues

### 2. Better Error Handling
Added detailed logging:
```javascript
if (error) {
  console.error('Supabase storage error:', error);
  throw new Error(error.message || 'Upload failed');
}
```

### 3. Added Content Type
```javascript
contentType: 'image/jpeg'
```

This ensures Supabase knows it's an image file.

---

## 📊 Summary

| Item | Status | Action |
|------|--------|--------|
| Bucket exists | ✅ Done | You created it |
| Bucket is public | ⚠️ Check | Enable in settings |
| Policies applied | ⚠️ Update | Run SQL above |
| Code fixed | ✅ Done | Deployed |

**After running the SQL policies above, image upload will work! 🚀**
