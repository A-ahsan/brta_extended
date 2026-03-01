# 🎯 DATABASE SETUP - Step by Step Guide

## ✅ CONFIRMED: No RLS Policies!

The `route_permits` table has **NO RLS (Row Level Security)** policies - just like you requested!

---

## 📋 Step 1: Run SQL Script in Supabase

1. **Go to Supabase**: https://supabase.com/dashboard
2. **Select your BRTA project**
3. **Click "SQL Editor"** (left sidebar)
4. **Click "New Query"**
5. **Copy ALL content** from: `database/route_permits_system.sql`
6. **Paste** into SQL Editor
7. **Click "Run"** button (or press F5)
8. **Wait for success** ✅

**What this creates:**
- ✅ `route_permits` table (NO RLS - open access)
- ✅ `generate_route_permit_number()` function
- ✅ `calculate_route_permit_fee()` function
- ✅ `expire_route_permits()` function
- ✅ Storage bucket: `route-permit-documents` (PUBLIC)
- ✅ Updated `payments` table constraint
- ✅ Updated `notifications` table constraint
- ✅ Indexes for performance
- ✅ Auto-update trigger

---

## 📋 Step 2: Configure Storage Bucket (MANUAL)

After running SQL, you need to **manually set storage policies**:

### 2.1 Go to Storage Section
1. Click **"Storage"** in left sidebar
2. You should see `route-permit-documents` bucket (created by SQL)

### 2.2 Configure Bucket Policies
1. Click on **`route-permit-documents`** bucket
2. Click **"Policies"** tab
3. Click **"New Policy"**
4. Select **"For full customization"**

### 2.3 Create Policy for All Operations
**Copy this policy:**

```sql
-- Policy Name: Allow all operations on route permit documents
-- Operation: All (SELECT, INSERT, UPDATE, DELETE)

CREATE POLICY "Allow all operations on route permit documents"
ON storage.objects FOR ALL
TO public
USING (bucket_id = 'route-permit-documents')
WITH CHECK (bucket_id = 'route-permit-documents');
```

**OR** use the UI:
- Policy Name: `Allow all operations`
- Allowed operation: **All**
- Target roles: **public** (check the box)
- Policy definition: 
  - USING: `bucket_id = 'route-permit-documents'`
  - WITH CHECK: `bucket_id = 'route-permit-documents'`

**Click "Save"**

---

## ✅ Verify Everything

### Check 1: Table Created
1. Go to **Table Editor**
2. Look for `route_permits` table
3. Should have 25+ columns
4. **Check RLS**: Click table → Should say **"RLS disabled"** ✅

### Check 2: Functions Created
1. Go to **Database** → **Functions**
2. Should see:
   - `generate_route_permit_number`
   - `calculate_route_permit_fee`
   - `expire_route_permits`

### Check 3: Storage Bucket
1. Go to **Storage**
2. Should see `route-permit-documents` bucket
3. Click it → Should see "Policies" tab with your policy

### Check 4: Test Function
1. Go to **SQL Editor** → New Query
2. Run: `SELECT generate_route_permit_number();`
3. Should return: `RP2025000001` ✅

---

## 🚀 After Setup Complete

### Restart Your Servers:

**Terminal 1 - Backend:**
```powershell
cd d:\My_Project\brta_extended\backend
node server.js
```

**Terminal 2 - Frontend:**
```powershell
cd d:\My_Project\brta_extended
npm run dev
```

---

## 🧪 Quick Test

1. **Login as user**
2. **Click "Route Permits"** in sidebar (🗺️ icon)
3. **Should see** Route Permits page load
4. **Click "Apply for Route Permit"**
5. **Modal should open** with 3 steps
6. **Map should load** (click to select route)

If all works → **Setup is complete!** ✅

---

## 🆘 Troubleshooting

**SQL Error "syntax error at or near NOT":**
- ✅ **FIXED!** - Updated SQL script removed storage policies (they go in Storage UI)

**Table has RLS enabled:**
- No! The script does **NOT** enable RLS
- `route_permits` table is **open access** (no RLS)
- Only storage bucket has policies (for file uploads)

**Storage bucket not created:**
- Should auto-create from SQL
- If not, manually create:
  - Go to Storage → New Bucket
  - Name: `route-permit-documents`
  - Public: **Yes** ✅
  - Then add policy as shown above

**Functions not working:**
- Check they exist in Database → Functions
- Try running `SELECT generate_route_permit_number();` manually

---

## 📊 Database Table Details

### route_permits Table (NO RLS!)

**Columns (25 total):**
- `id` - UUID primary key
- `permit_number` - Unique (RP2025XXXXXX)
- `user_id` - Links to auth.users
- `vehicle_id` - Links to registered_vehicles
- `route_data` - JSONB (map data)
- `route_from_en/bn` - Start location
- `route_to_en/bn` - End location
- `distance_km` - Calculated distance
- `permit_days` - Duration (1-365)
- `issue_date/expiry_date` - Validity period
- `reason_document_url` - File path in storage
- `reason_description_en/bn` - Why permit needed
- `base_fee/distance_fee/total_fee` - Calculated fees
- `payment_id` - Links to payments table
- `payment_status` - pending/completed/failed
- `status` - pending/approved/rejected/expired
- `reviewed_by` - Admin who approved/rejected
- `rejection_reason_en/bn` - If rejected
- `qr_code_data` - QR code JSON
- `created_at/updated_at` - Timestamps

**RLS Status:** ❌ **DISABLED** (as you requested)

---

## 🎯 Summary

1. ✅ Run SQL script (creates table + functions)
2. ✅ Add storage policy manually (in Storage UI)
3. ✅ Verify table exists (no RLS)
4. ✅ Restart servers
5. ✅ Test route permits feature

**Total time:** ~2 minutes!

**You're almost done!** 🚀
