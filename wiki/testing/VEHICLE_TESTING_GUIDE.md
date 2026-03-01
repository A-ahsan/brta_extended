# Vehicle Registration & Smart Card Testing Guide

## Issues Fixed ✅

1. **JSX Structure** - Fixed broken JSX in PoliceVerification.jsx
2. **User Photo** - Added owner photo fetching from profiles table
3. **Card Styling** - Redesigned card to match mock style with blue gradient
4. **QR Code** - Fixed QR generation and scanning workflow

---

## How to Test the System

### Step 1: Re-register a Vehicle (To Generate New QR Code)

Since your existing vehicle was registered before QR codes were properly implemented, you need to register a new vehicle:

1. **Login as User** (not police/admin)
2. **Go to Dashboard** → Click **"Register New Vehicle"** button
3. **Fill Vehicle Registration Form:**
   - Upload vehicle photo
   - Enter vehicle details (name, model, engine number, CC, type)
   - Select division
   - Choose registration period (1-15 years)
4. **Complete Payment:**
   - Click "Proceed to Payment"
   - Complete bKash/Nagad payment (use test numbers)
   - Wait for payment confirmation

5. **Backend Will Process:**
   - Generate registration number (e.g., REG-000001)
   - Generate bilingual plate (e.g., ঢাকা মেট্রো-গ-১২৩৪৫৬)
   - **Create QR code** with this data:
     ```json
     {
       "registration_number": "REG-000001",
       "plate": {"en": "Dhaka Metro-Ga-123456", "bn": "ঢাকা মেট্রো-গ-১২৩৪৫৬"},
       "owner": "Your Name",
       "vehicle": "Toyota Corolla",
       "engine": "ENG12345",
       "cc": "1500",
       "type": "Private Car",
       "valid_until": "2026-12-01"
     }
     ```

6. **Check Your Dashboard:**
   - You should see a **new smart card** with:
     - ✅ Your profile photo (from profiles table)
     - ✅ Blue gradient background (like mock)
     - ✅ Bilingual number plate
     - ✅ QR code on the right side
     - ✅ All vehicle details
     - ✅ Owner information

---

### Step 2: Test QR Code Scanning (Police Dashboard)

#### Option A: Scan with Mobile Camera

1. **Login as Police Officer**
2. **Go to Police Verification** page
3. **Click "Scan QR Code"** button
4. **Click "📸 Camera"** mode
5. **Grant camera permission** when prompted
6. **Point your mobile camera** at the QR code on the smart card
   - You can scan from another device showing the card
   - Or print the card and scan it
7. **Wait for scan** - it should:
   - ✅ Detect QR code automatically
   - ✅ Parse the JSON data
   - ✅ Show vehicle details immediately

#### Option B: Upload QR Image

1. **Take a screenshot** of the QR code from the smart card
2. **Login as Police Officer**
3. **Go to Police Verification** page
4. **Click "Scan QR Code"** button
5. **Click "🖼️ Upload"** mode
6. **Click to upload** QR code image
7. **Select the screenshot** you took
8. **System will:**
   - ✅ Read QR from image
   - ✅ Parse the data
   - ✅ Show vehicle details

#### Option C: Manual Search

If QR doesn't work, you can still search manually:

1. **Copy registration number** from smart card (e.g., REG-000001)
2. **Paste in search box** on Police Verification page
3. **Click "Search"** button
4. **Vehicle details** will appear

---

### Step 3: Record Inspection

After verifying a vehicle:

1. **Click "📝 Record Inspection"** button
2. **Fill inspection form:**
   - **Type:** Routine Check / Warning Issued / Fine Issued / Document Requested
   - **Location:** (Optional) e.g., "Mirpur-10 Checkpoint"
   - **Remarks:** (Optional) e.g., "All documents valid"
3. **Click "Record"** button
4. **System will:**
   - ✅ Save inspection to `police_inspections` table
   - ✅ Send notification to vehicle owner
   - ✅ Show success message

---

## Troubleshooting

### QR Code Not Scanning from Camera?

**Possible Causes:**
- Camera permission not granted
- QR code too small or blurry
- Poor lighting
- Mobile camera not supported

**Solutions:**
1. Try the **Upload mode** instead
2. Increase QR code size (zoom in)
3. Ensure good lighting
4. Try on a different device
5. Use manual search as backup

### QR Code Data Invalid?

**Possible Causes:**
- Vehicle registered before QR feature was added
- QR generation failed

**Solutions:**
1. **Delete old vehicle registration** from database:
   ```sql
   DELETE FROM registered_vehicles WHERE id = YOUR_VEHICLE_ID;
   ```
2. **Re-register the vehicle** following Step 1 above
3. **New QR will be generated** automatically

### Smart Card Still Shows Mock Data?

**Possible Causes:**
- Browser cache
- Old component loaded

**Solutions:**
1. **Hard refresh** browser (Ctrl + Shift + R)
2. **Clear cache** and reload
3. **Check console** for errors
4. **Verify data** in Supabase `registered_vehicles` table

### Photo Not Showing on Card?

**Possible Causes:**
- No photo in profiles table
- Photo URL expired/invalid

**Solutions:**
1. **Go to Settings** in user dashboard
2. **Upload new profile photo**
3. **Refresh card** page
4. **Photo should appear** on card

---

## Database Structure Reference

### `registered_vehicles` Table Columns:
```
- id (uuid)
- registration_number (text) - e.g., "REG-000001"
- registration_plate (jsonb) - {"en": "...", "bn": "..."}
- vehicle_name (text) - e.g., "Toyota Corolla"
- model (text) - e.g., "2022"
- engine_number (text)
- engine_cc (integer)
- vehicle_type (text)
- owner_name_en (text)
- owner_name_bn (text)
- owner_nid (text)
- owner_dl_number (text)
- qr_code_data (jsonb) - QR JSON data
- registration_date (date)
- valid_until (date)
- status (text) - "active" or "expired"
- user_id (uuid) - FK to profiles
```

### `police_inspections` Table Columns:
```
- id (uuid)
- registered_vehicle_id (uuid) - FK to registered_vehicles
- police_user_id (uuid) - FK to profiles
- inspection_type (text)
- location (text)
- remarks (text)
- created_at (timestamp)
```

---

## Quick Test Checklist

- [ ] Register new vehicle as user
- [ ] Complete payment flow
- [ ] Check smart card appears in dashboard
- [ ] Verify photo shows on card
- [ ] Verify blue gradient styling
- [ ] Check QR code visible
- [ ] Login as police
- [ ] Test camera QR scan
- [ ] Test file upload QR scan
- [ ] Test manual search
- [ ] Record inspection
- [ ] Check user receives notification
- [ ] Verify inspection saved in database

---

## Backend Commands

### Start Backend Server:
```powershell
Set-Location backend
node server.js
```

### Check Registered Vehicles:
```sql
SELECT registration_number, vehicle_name, owner_name_en, 
       qr_code_data, registration_date, valid_until 
FROM registered_vehicles 
ORDER BY created_at DESC;
```

### Check Inspections:
```sql
SELECT i.*, v.registration_number, v.vehicle_name
FROM police_inspections i
JOIN registered_vehicles v ON i.registered_vehicle_id = v.id
ORDER BY i.created_at DESC;
```

---

## Support

If issues persist:
1. Check browser console for errors
2. Check backend terminal for server errors
3. Verify Supabase connection
4. Ensure all tables exist and have proper RLS policies
5. Check notification constraints include 'general' type

---

**All systems ready for testing! 🚀**
