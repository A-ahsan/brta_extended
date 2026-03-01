# 🚀 OWNERSHIP TRANSFER - SETUP & DEPLOYMENT GUIDE

## ⚠️ IMPORTANT: Run These Steps in Order

### Step 1: Database Schema Setup ✅
Run this SQL file in Supabase SQL Editor:

```sql
-- File: database/vehicle_ownership_transfer_system.sql
```

This creates:
- ✅ `ownership_transfer_applications` table
- ✅ `ownership_transfer_history` table
- ✅ 5 RPC functions
- ✅ 11 indexes
- ✅ Triggers
- ✅ Realtime subscriptions

---

### Step 2: Add New Owner Photo Column 📸
Run this SQL file in Supabase SQL Editor:

```sql
-- File: database/add_new_owner_photo_column.sql
```

This adds:
- ✅ `new_owner_photo_url` column to store license photo

---

### Step 3: Storage Bucket Setup 🗄️
Run this SQL file in Supabase SQL Editor:

```sql
-- File: database/ownership_transfer_storage_setup.sql
```

This creates:
- ✅ Storage bucket: `ownership-transfer-deeds` (PRIVATE)
- ✅ 5 Storage policies:
  1. Users can upload deed documents
  2. Users can view their own deed documents
  3. Admins can view all deed documents
  4. Users can update their own deed documents
  5. Users can delete their own deed documents

**Folder Structure:** `{user_id}/{filename}`

**Alternative (Manual Creation):**
If SQL fails, create manually in Supabase Dashboard:
1. Go to Storage → Create bucket
2. Bucket name: `ownership-transfer-deeds`
3. Public: **NO** (Private bucket)
4. Click "Create bucket"

Then add policies in SQL Editor or Dashboard.

---

### Step 4: Update Payment Type Constraint ⚡
Run this SQL in Supabase SQL Editor:

```sql
-- Add 'ownership_transfer' to payment_type constraint
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

---

### Step 5: Backend Setup (Already Complete) ✅

Files modified:
1. **backend/server.js**
   - ✅ `/api/payment/ownership-transfer` endpoint
   - ✅ `/api/ownership-transfer/process` endpoint

2. **backend/updatePayment.js**
   - ✅ Ownership transfer payment detection
   - ✅ Payment success/fail handlers
   - ✅ Bilingual notifications

---

### Step 6: Frontend Setup (Already Complete) ✅

Files created/modified:
1. **src/components/OwnershipTransferModal.jsx** - 4-step wizard
2. **src/components/UserOwnershipTransfers.jsx** - User dashboard
3. **src/pages/admin/AdminOwnershipTransfers.jsx** - Admin review
4. **src/pages/UserDashboard.jsx** - Menu integration
5. **src/pages/AdminPanel.jsx** - Menu integration

---

## 🧪 Testing Checklist

### Database Tests
- [ ] Run `vehicle_ownership_transfer_system.sql` - No errors
- [ ] Run `add_new_owner_photo_column.sql` - Column added
- [ ] Run `ownership_transfer_storage_setup.sql` - Bucket created
- [ ] Check: `SELECT * FROM ownership_transfer_applications LIMIT 1;` - Table exists
- [ ] Check: `SELECT * FROM storage.buckets WHERE id = 'ownership-transfer-deeds';` - Bucket exists

### Backend Tests
- [ ] Start backend: `cd backend && node server.js`
- [ ] Check logs: Should show "Server running on port 5000"
- [ ] Payment endpoint available: `/api/payment/ownership-transfer`
- [ ] Process endpoint available: `/api/ownership-transfer/process`

### Frontend Tests
- [ ] User Dashboard → Ownership Transfer menu visible
- [ ] Admin Dashboard → Ownership Transfers menu visible
- [ ] Click "New Transfer Application" → Modal opens
- [ ] Select vehicle → Eligibility check runs
- [ ] Enter DL number → User data fetched (with photo)
- [ ] Upload deed document → File uploads to storage
- [ ] Submit → Application created, admin notified

### Admin Tests
- [ ] Admin sees new application in real-time
- [ ] Admin can view deed document
- [ ] Admin can see new owner photo
- [ ] Admin can approve → User notified
- [ ] Admin can reject with notes → User notified

### Payment Tests
- [ ] Approved application shows "Pay Now" button
- [ ] Click Pay Now → SSL Commerz page opens
- [ ] Complete payment → Status updates to "payment_completed"
- [ ] Transfer executes automatically
- [ ] Vehicle ownership changes
- [ ] Both users receive completion notification

---

## 🔍 Verification Queries

### Check all tables exist:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('ownership_transfer_applications', 'ownership_transfer_history')
AND table_schema = 'public';
```

### Check functions exist:
```sql
SELECT proname 
FROM pg_proc 
WHERE proname LIKE '%ownership_transfer%';
```

### Check storage bucket:
```sql
SELECT * FROM storage.buckets WHERE id = 'ownership-transfer-deeds';
```

### Check storage policies:
```sql
SELECT policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects' 
AND policyname LIKE '%deed%';
```

### Check payment type constraint:
```sql
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'payments'::regclass 
AND conname = 'payments_payment_type_check';
```

---

## 📋 Quick Setup Commands (Copy-Paste)

### 1. Run all database scripts:
```bash
# In Supabase SQL Editor, run in this order:
1. vehicle_ownership_transfer_system.sql
2. add_new_owner_photo_column.sql
3. ownership_transfer_storage_setup.sql
```

### 2. Start backend:
```bash
cd backend
node server.js
```

### 3. Start frontend:
```bash
npm run dev
```

---

## 🎯 Feature Workflow

```
USER FLOW:
1. User Dashboard → Ownership Transfer
2. Click "New Transfer Application"
3. Select vehicle (auto eligibility check)
4. Enter new owner's DL number (auto-fetch data + photo)
5. Upload deed document (দলিল)
6. Review and submit
7. Wait for admin approval
8. Receive notification
9. Pay transfer fee (SSL Commerz)
10. Transfer completes automatically
11. Receive completion notification

ADMIN FLOW:
1. Admin Dashboard → Ownership Transfers
2. See new applications in real-time
3. View application details (vehicle, new owner, deed, photo)
4. Check eligibility results
5. Approve or Reject with notes
6. User receives notification
7. Monitor payment completion
8. Transfer executes automatically
```

---

## 🐛 Troubleshooting

### Storage bucket not working?
```sql
-- Check if bucket exists
SELECT * FROM storage.buckets WHERE id = 'ownership-transfer-deeds';

-- Check policies
SELECT * FROM storage.policies WHERE bucket_id = 'ownership-transfer-deeds';

-- If missing, re-run ownership_transfer_storage_setup.sql
```

### Photo not showing?
```sql
-- Check if column exists
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'ownership_transfer_applications' 
AND column_name = 'new_owner_photo_url';

-- If missing, run add_new_owner_photo_column.sql
```

### Payment not processing?
```sql
-- Check payment type constraint
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'payments'::regclass;

-- Should include 'ownership_transfer'
```

### RPC function errors?
```sql
-- Check function exists
SELECT proname, prosrc FROM pg_proc 
WHERE proname = 'execute_ownership_transfer';

-- Re-run vehicle_ownership_transfer_system.sql if needed
```

---

## ✅ Success Indicators

You'll know everything is working when:
- ✅ No SQL errors when running setup scripts
- ✅ Storage bucket visible in Supabase Storage
- ✅ Menu items visible in both user & admin dashboards
- ✅ Modal opens without errors
- ✅ DL search returns user data with photo
- ✅ Deed upload works (check Storage → ownership-transfer-deeds)
- ✅ Application appears in admin dashboard immediately
- ✅ Approve/Reject sends notifications
- ✅ Payment button appears for approved applications
- ✅ Payment completes and transfer executes
- ✅ Vehicle owner changes in database

---

## 📞 Support

If you encounter issues:
1. Check browser console for errors
2. Check backend logs for errors
3. Check Supabase logs in Dashboard
4. Verify all SQL scripts ran successfully
5. Check storage bucket and policies exist

**All files are ready to deploy!** 🚀
