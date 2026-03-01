# Vehicle Registration Issues - URGENT FIXES ✅

## Issues Found & Fixed
1. ✅ **Payment table constraint error** - `payment_type` doesn't allow 'vehicle_registration'
2. ✅ **Notification table constraint error** - `notification_type` doesn't allow 'vehicle_registration'
3. ✅ **User profile query error** - profiles table uses 'id' not 'user_id', and has 'full_name' not bilingual names
4. ⚠️ **Storage bucket missing** - vehicle-documents bucket doesn't exist (manual fix needed)

---

## 🔧 STEP 1: Execute SQL Fix

**Copy and execute this in Supabase SQL Editor:**

```sql
-- Fix Vehicle Registration Issues
-- 1. Update payment_type constraint to include vehicle_registration
-- 2. Update notification_type constraint to include vehicle_registration

-- ===== FIX 1: Payment Type Constraint =====
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_payment_type_check;
ALTER TABLE payments ADD CONSTRAINT payments_payment_type_check 
  CHECK (payment_type IN ('application', 'renewal', 'vehicle_registration', 'fine', 'other'));

-- ===== FIX 2: Notification Type Constraint =====
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_notification_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_notification_type_check 
  CHECK (notification_type IN ('application', 'verification', 'exam', 'payment', 'approval', 'rejection', 'general', 'renewal', 'vehicle_registration', 'vehicle_added', 'admin_vehicle_alert', 'vehicle_registration_complete'));

-- ===== VERIFY CONSTRAINTS =====
SELECT 'PAYMENT CONSTRAINT:' as check_type, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conname = 'payments_payment_type_check'
UNION ALL
SELECT 'NOTIFICATION CONSTRAINT:' as check_type, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conname = 'notifications_notification_type_check';
```

**Expected Result:**
You should see both constraints with the new types included:
- Payment: `'vehicle_registration'` added
- Notification: `'vehicle_registration'`, `'vehicle_added'`, `'admin_vehicle_alert'`, `'vehicle_registration_complete'` added

---

## 🔧 STEP 2: Create Storage Bucket

**In Supabase Dashboard:**

1. Go to **Storage** section
2. Click **New bucket**
3. Name: `vehicle-documents`
4. Public bucket: ✅ **YES** (checked)
5. Click **Create bucket**

**Then apply these policies:**

Go to the `vehicle-documents` bucket → Policies → New Policy

**Policy 1: Public Read Access**
```sql
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'vehicle-documents');
```

**Policy 2: Authenticated Upload**
```sql
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'vehicle-documents');
```

**Policy 3: Users can update own files**
```sql
CREATE POLICY "Users can update own files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'vehicle-documents');
```

---

## 🔧 STEP 3: Restart Backend Server

The code fixes have been applied. Restart your backend:

```powershell
# Stop the current server (Ctrl+C in terminal)
# Then restart:
cd backend
node server.js
```

---

## 🧪 TESTING STEPS

### Test 1: Vehicle Registration Payment

**A. Login as a user who has a license**

**B. Register a vehicle:**
1. Go to "Vehicles" tab
2. Click "Register Vehicle"
3. Select vehicle
4. Choose division and period
5. Upload photo or use DL photo
6. Click "Proceed to Payment"

**Expected:** Should redirect to SSLCommerz (no payment_type error)

**C. Complete payment**

**Expected:** 
- Payment processes successfully
- Vehicle gets registration number and bilingual plate
- User receives notification
- Admin receives notification

---

### Test 2: Vehicle Adder Notifications

**A. Login as Vehicle Adder**
```
Email: vehicleadder@brta.gov.bd
Password: VehicleAdder123!
```

**B. Add a vehicle:**
1. Select a license holder
2. Fill vehicle details (with CC field)
3. Click "Add Vehicle"

**Expected:** Success message

**C. Check notifications:**
1. **Log out** from vehicle adder
2. **Log in as the license holder**
3. Click bell icon 🔔
4. **Expected:** See "Vehicle Added to Your Profile"

**D. Check admin notifications:**
1. **Log out**
2. **Log in as admin**
3. Click bell icon 🔔
4. **Expected:** See "New Vehicle Added by Vehicle Adder"

---

## 📋 CODE FIXES APPLIED

### ✅ Backend Fixes

**File: `backend/server.js`**
- Fixed profiles query to use `id` instead of `user_id`
- Changed to get bilingual names from `licenses` table (not profiles)
- Fixed to use `nid_number` from licenses table

**File: `backend/updatePayment.js`**
- Fixed profiles query to use `id` instead of `user_id`  
- Changed to use `full_name` (profiles table doesn't have bilingual names)

### ✅ Database Schema Updates

**File: `database/fix_vehicle_registration_issues.sql`**
- Payment constraint updated with 'vehicle_registration'
- Notification constraint updated with vehicle registration types

**File: `database/notifications_schema.sql`**
- Expanded notification_type to include all vehicle registration types

**File: `database/license_renewal_schema.sql`**
- Updated to include vehicle registration notification types

---

## 🐛 TROUBLESHOOTING

### Issue: "Still getting payment_type error"
**Solution:** 
1. Make sure you executed the SQL in Supabase
2. Verify with:
```sql
SELECT pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conname = 'payments_payment_type_check';
```
3. Should show `'vehicle_registration'` in the list

### Issue: "Still getting notification_type error"
**Solution:**
1. Execute the notification constraint update SQL
2. Restart backend server
3. Clear browser cache

### Issue: "Bucket not found"
**Solution:**
- Bucket name must be exactly `vehicle-documents` (with hyphen)
- Make sure it's marked as PUBLIC
- Add all 3 storage policies

### Issue: "User profile not found"
**Solution:**
- User must have a driving license before registering vehicles
- This is by design - only licensed drivers can register vehicles

### Issue: "Notifications not showing"
**Solution:**
- Refresh the page (F5)
- Notifications go to license holder and admins, NOT vehicle adder
- Make sure you're logged in as the correct user

---

## ✅ VERIFICATION CHECKLIST

After applying all fixes:

- [ ] SQL executed in Supabase
- [ ] Both constraints verified (payment & notification)
- [ ] Storage bucket created: vehicle-documents
- [ ] Storage policies applied (3 policies)
- [ ] Backend server restarted
- [ ] Vehicle registration payment works
- [ ] Payment processes successfully
- [ ] Vehicle gets bilingual number plate
- [ ] User receives notification
- [ ] Admin receives notification
- [ ] Vehicle Adder notifications work

---

## 🎯 WHAT'S FIXED

1. **Payment Type Constraint** - Now allows 'vehicle_registration'
2. **Notification Type Constraint** - Now allows all vehicle registration related types
3. **Profiles Query** - Fixed to use correct column name ('id' not 'user_id')
4. **Bilingual Names** - Now pulled from licenses table (which has full_name_en/bn)
5. **NID Number** - Now pulled from licenses table (nid_number column)

---

## 📞 NEXT STEPS

Once all checks pass:
1. ✅ Complete vehicle registration flow working
2. ✅ Notifications working for all parties
3. 🎯 Ready to test full end-to-end workflow
4. 🎯 Move to next features: tax tokens, police scanner, fines
