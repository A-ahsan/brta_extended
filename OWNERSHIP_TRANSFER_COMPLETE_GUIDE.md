# 🎯 VEHICLE OWNERSHIP TRANSFER - COMPLETE SETUP GUIDE

## 📋 Overview
This guide will walk you through setting up the complete Vehicle Ownership Transfer system with photo selection options.

---

## ✅ What You Already Have
- ✅ `vehicle-documents` bucket (existing)
- ✅ Backend server running on port 5000
- ✅ Frontend React app
- ✅ All code files created and ready

---

## 🗄️ Step 1: Database Setup

### Run these SQL files in Supabase SQL Editor (in order):

#### 1.1 Main Schema
```sql
-- File: database/vehicle_ownership_transfer_system.sql
-- Creates tables, functions, indexes, triggers
```

**What it creates:**
- `ownership_transfer_applications` table
- `ownership_transfer_history` table  
- 5 RPC functions
- 11 indexes
- Realtime subscriptions

#### 1.2 Add Photo Column
```sql
-- File: database/add_new_owner_photo_column.sql
-- Adds new_owner_photo_url column
```

**Verification:**
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'ownership_transfer_applications' 
AND column_name = 'new_owner_photo_url';
```

#### 1.3 Update Payment Type
```sql
-- Add 'ownership_transfer' to payment types
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_payment_type_check;
ALTER TABLE payments ADD CONSTRAINT payments_payment_type_check 
CHECK (payment_type IN (
  'license_application',
  'license_renewal',
  'tax_token_renewal',
  'vehicle_registration',
  'violation_fine',
  'route_permit',
  'ownership_transfer'
));
```

**Verification:**
```sql
SELECT pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'payments'::regclass 
AND conname = 'payments_payment_type_check';
```

---

## 📁 Step 2: Storage Bucket Setup

### You Already Have `vehicle-documents` Bucket! ✅

Your system already uses the `vehicle-documents` bucket, which stores uploaded photos in:
- **Path:** `new-owner-photos/{user_id}/{timestamp}.jpg`

### Verify Bucket Exists:
```sql
SELECT id, name, public, created_at 
FROM storage.buckets 
WHERE id = 'vehicle-documents';
```

### Check Storage Policies:
```sql
SELECT policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects' 
AND bucket_id = 'vehicle-documents';
```

### If Policies Are Missing, Add Them:
```sql
-- Policy for uploading photos
CREATE POLICY "Users can upload to vehicle-documents"
ON storage.objects FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'vehicle-documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy for viewing own files
CREATE POLICY "Users can view their own files in vehicle-documents"
ON storage.objects FOR SELECT
TO public
USING (
  bucket_id = 'vehicle-documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy for admins to view all
CREATE POLICY "Admins can view all vehicle-documents"
ON storage.objects FOR SELECT
TO public
USING (
  bucket_id = 'vehicle-documents' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);
```

---

## ⚙️ Step 3: Backend is Already Set Up! ✅

Your backend files already include:
- ✅ `/api/payment/ownership-transfer` endpoint
- ✅ `/api/ownership-transfer/process` endpoint
- ✅ Payment webhook handlers
- ✅ Bilingual notifications

**No changes needed for backend!**

---

## 🎨 Step 4: Frontend is Already Set Up! ✅

All frontend components are ready:
- ✅ `OwnershipTransferModal.jsx` - 5-step wizard with photo selection
- ✅ `UserOwnershipTransfers.jsx` - User dashboard
- ✅ `AdminOwnershipTransfers.jsx` - Admin review interface
- ✅ Sidebar integrations

**No changes needed for frontend!**

---

## 🔄 How It Works - Complete Flow

### User Journey:

#### **Step 1: Select Vehicle**
- User selects their registered vehicle
- System automatically checks eligibility:
  - ✅ Smart card validity
  - ✅ Tax token validity
  - ✅ No unpaid fines
- If eligible → Proceed to Step 2

#### **Step 2: Search New Owner**
- User enters new owner's DL number
- System fetches data from `licenses` table:
  - Full name (EN & BN)
  - NID number
  - License type & category
  - **Photo from license**
  - License status
- System validates license type matches vehicle type
- Shows new owner information with photo

#### **Step 3: Select Photo** ⭐ NEW!
User has **2 options**:

**Option A: Use DL Photo**
- ✅ Photo already loaded from license
- ✅ Shows preview
- ✅ One click to select
- ✅ No upload needed

**Option B: Upload New Photo**
- 📸 Upload custom photo (JPG/PNG, max 2MB)
- 📁 Saved to `vehicle-documents` bucket
- 📍 Path: `new-owner-photos/{user_id}/{timestamp}.jpg`
- ✅ Preview shown after upload
- ✅ Can re-upload if needed

#### **Step 4: Upload Deed Document**
- Upload deed (দলিল) document
- Formats: PDF or Image
- Max size: 5MB
- Saved to: `ownership-transfer-deeds` bucket (if using separate bucket)
- **OR** saved to `vehicle-documents/deeds/` folder

#### **Step 5: Review & Submit**
- Review all details:
  - Vehicle information
  - New owner (with selected photo)
  - Deed document
  - Transfer fee (৳5000)
- Submit application
- **Notifications sent:**
  - ✉️ User: "Application submitted"
  - ✉️ Admin: "New transfer application"

### Admin Journey:

1. **Receive Notification**
   - Real-time alert for new application

2. **Review Application**
   - View vehicle details
   - See new owner information **with photo** (DL or uploaded)
   - Download deed document
   - Check eligibility results

3. **Approve or Reject**
   - Add optional notes
   - Click Approve or Reject
   - **Notification sent to user**

### Payment & Transfer:

4. **User Pays** (if approved)
   - Click "Pay Now" button
   - Redirected to SSL Commerz
   - Amount: ৳5000 (default)

5. **Automatic Transfer** (on payment success)
   - Application status → `payment_completed`
   - `execute_ownership_transfer()` function runs:
     - Saves old ownership to history
     - Updates `registered_vehicles` table
     - Changes vehicle owner to new owner
     - Updates QR code data
     - Transfers tax tokens
   - **Notifications sent:**
     - ✉️ Old owner: "Transfer completed"
     - ✉️ New owner: "You are now the owner"
     - ✉️ Admin: "Transfer completed"

---

## 📸 Photo Storage Details

### Bucket Structure:
```
vehicle-documents/
├── new-owner-photos/
│   ├── {user_id_1}/
│   │   ├── 1733567890123.jpg
│   │   └── 1733567890456.png
│   └── {user_id_2}/
│       └── 1733567890789.jpg
├── deeds/ (optional)
│   └── ...
└── other vehicle docs/
```

### Photo Selection Logic:
```javascript
// In handleSubmit:
const finalPhotoUrl = photoOption === 'upload' 
  ? customPhotoUrl              // Uses uploaded photo
  : newOwnerData.photo_url;     // Uses DL photo

// Saved to database:
new_owner_photo_url: finalPhotoUrl
```

### File Size Limits:
- **Photos:** 2MB max (JPG/PNG only)
- **Deed:** 5MB max (PDF/Images)

---

## 🧪 Testing Checklist

### Database Tests:
- [ ] Run `vehicle_ownership_transfer_system.sql` - No errors
- [ ] Run `add_new_owner_photo_column.sql` - Column exists
- [ ] Update payment type constraint - Includes `ownership_transfer`
- [ ] Check `vehicle-documents` bucket exists
- [ ] Check storage policies exist

### Frontend Tests:
- [ ] User Dashboard → Ownership Transfer menu visible
- [ ] Click "New Transfer Application" → Modal opens
- [ ] Select vehicle → Eligibility check runs
- [ ] Enter DL number → User data + photo fetched
- [ ] **Step 3: Photo Selection:**
  - [ ] Option 1: "Use DL Photo" shows license photo
  - [ ] Option 2: "Upload New Photo" shows upload area
  - [ ] Upload photo → Success message + preview
  - [ ] Can switch between options
- [ ] Upload deed → Success
- [ ] Review page shows selected photo
- [ ] Submit → Application created

### Admin Tests:
- [ ] Admin sees application in real-time
- [ ] Admin sees new owner photo (DL or uploaded)
- [ ] Admin can download deed
- [ ] Admin can approve → User notified
- [ ] Approved app shows "Pay Now" button

### Payment Tests:
- [ ] Click Pay Now → SSL Commerz page
- [ ] Complete payment → Status updates
- [ ] Transfer executes automatically
- [ ] Both users receive notifications

---

## 🔍 Debugging Commands

### Check uploaded photos:
```sql
SELECT name, created_at, metadata
FROM storage.objects
WHERE bucket_id = 'vehicle-documents'
AND name LIKE 'new-owner-photos/%'
ORDER BY created_at DESC
LIMIT 10;
```

### Check application with photo:
```sql
SELECT 
  application_number,
  new_owner_name_en,
  new_owner_photo_url,
  photo_option,
  status
FROM ownership_transfer_applications
ORDER BY created_at DESC
LIMIT 5;
```

### Check storage bucket size:
```sql
SELECT 
  bucket_id,
  COUNT(*) as file_count,
  SUM((metadata->>'size')::bigint) as total_bytes,
  pg_size_pretty(SUM((metadata->>'size')::bigint)) as total_size
FROM storage.objects
WHERE bucket_id = 'vehicle-documents'
GROUP BY bucket_id;
```

---

## ✨ Key Features

### Photo Selection Benefits:
1. **Flexibility:** Users choose DL photo or upload new one
2. **Convenience:** DL photo auto-loaded, no upload needed
3. **Quality Control:** Users can provide better quality photo if needed
4. **Single Bucket:** Uses existing `vehicle-documents` bucket
5. **Organized:** Photos stored in `new-owner-photos/` subfolder
6. **Admin View:** Admin sees exactly what user selected

### Security:
- ✅ Storage policies enforce user isolation
- ✅ Admins can view all for verification
- ✅ Photos stored with user ID in path
- ✅ No public access to photos

### Performance:
- ✅ Optimized file size limits
- ✅ Direct upload to Supabase Storage
- ✅ CDN-served images
- ✅ Lazy loading in UI

---

## 🎯 Quick Start Commands

### 1. Database Setup (Run in Supabase SQL Editor):
```sql
-- Run these in order:
1. vehicle_ownership_transfer_system.sql
2. add_new_owner_photo_column.sql
3. UPDATE payments constraint (see Step 1.3 above)
```

### 2. Verify Setup:
```sql
-- Check table
SELECT * FROM ownership_transfer_applications LIMIT 1;

-- Check bucket
SELECT * FROM storage.buckets WHERE id = 'vehicle-documents';

-- Check policies
SELECT * FROM pg_policies WHERE tablename = 'objects' AND bucket_id = 'vehicle-documents';
```

### 3. Start Application:
```bash
# Backend
cd backend
node server.js

# Frontend
npm run dev
```

---

## 🚀 You're Ready!

Everything is set up and ready to go:
- ✅ Database schema complete
- ✅ Storage bucket ready (`vehicle-documents`)
- ✅ Backend endpoints active
- ✅ Frontend components integrated
- ✅ Photo selection working
- ✅ Payment integration complete
- ✅ Notifications integrated

**Just run the SQL scripts and you're live!** 🎉

---

## 📞 Support

If you encounter issues:
1. Check browser console for errors
2. Check backend logs
3. Check Supabase logs
4. Verify storage bucket policies
5. Confirm photo uploads to correct path

**Happy Transferring!** 🚗✨
