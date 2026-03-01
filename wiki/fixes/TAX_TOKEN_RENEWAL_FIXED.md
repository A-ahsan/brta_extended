# Tax Token Renewal - Complete Fix

## Issues Fixed

### 1. ✅ Database Error (500 Internal Server Error)
**Problem:** `renewal_days` column missing in `payments` table
**Solution:** Added missing columns to payments table

### 2. ✅ Max Renewal Period
**Problem:** Limited to 2 years (730 days)
**Solution:** Extended to 10 years (3650 days)

### 3. ✅ Double-Click UX Issue
**Problem:** User had to click "Tax Token" → then "Renew Token" separately
**Solution:** Smart detection - expired vehicles directly open renewal modal

## Setup Instructions

### Step 1: Run Database Fix

1. Go to your Supabase Dashboard → SQL Editor
2. Copy and paste the entire content from: `database/fix_tax_token_renewal.sql`
3. Click "Run" to execute
4. You should see: "Tax token renewal system setup complete!"

### Step 2: Restart Backend Server

```powershell
# Stop current server (Ctrl+C in the terminal)
# Then run:
cd D:\My_Project\brta_extended\backend
node server.js
```

### Step 3: Test the System

1. **Hard refresh your browser** (`Ctrl + Shift + R`)
2. Go to Dashboard → Vehicle Registration tab
3. Click "Renew Now" button on expired vehicle
4. Renewal modal should open directly
5. Try selecting different periods:
   - 30, 90, 180, 365 days (quick buttons)
   - Custom: 1 to 3650 days (up to 10 years)

## What Changed

### Database (`fix_tax_token_renewal.sql`)
- Added `vehicle_id` column to `payments`
- Added `payment_type` column (supports 'tax_token_renewal')
- Added `renewal_days` column
- Added `metadata` JSONB column
- Created `tax_token_renewals` table
- Created `process_tax_token_renewal()` function
- Added RLS policies

### Frontend (`TaxTokenRenewalModal.jsx`)
- Changed max from 730 → 3650 days
- Updated placeholder text
- Added localized "Max 10 years" text

### User Flow (`UserDashboard.jsx`)
- Modified `handleShowTaxToken()` to detect expired vehicles
- If expired: Opens renewal modal directly
- If active: Shows tax token modal as before

### Backend (`server.js`)
- Tax token renewal endpoints already exist
- Now they can store `renewal_days` properly

## Testing Checklist

- [ ] SQL script runs without errors
- [ ] Backend starts without errors
- [ ] Clicking "Renew Now" on expired vehicle opens renewal modal
- [ ] Can select days up to 3650 (10 years)
- [ ] Fee calculation works correctly
- [ ] Payment integration works
- [ ] Both vehicle and tax token dates update after payment

## Fee Structure (Unchanged)

**Motorcycles:**
- Below 100cc: ৳2,300/year
- 100cc and above: ৳3,450/year

**Cars (per year):**
- Up to 1000cc: ৳15,000
- 1001-1500cc: ৳25,000
- 1501-2000cc: ৳50,000
- 2001-2500cc: ৳100,000
- 2501-3000cc: ৳150,000
- Above 3000cc: ৳300,000

**Pro-rated:** (Annual Fee ÷ 365) × Days selected

## Support

If you encounter any issues:
1. Check browser console for errors (F12)
2. Check backend terminal for errors
3. Verify SQL script ran successfully in Supabase
4. Hard refresh browser (Ctrl + Shift + R)
