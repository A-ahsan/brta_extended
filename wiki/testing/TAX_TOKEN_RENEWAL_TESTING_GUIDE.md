# 🚗 Tax Token Renewal - Complete Testing Guide

## 📋 Overview
This guide will help you test the Tax Token Renewal system in your BRTA project. Tax tokens must be renewed annually to keep vehicles legally registered.

---

## 🎯 What is Tax Token Renewal?

**Tax Token**: Annual vehicle registration certificate
- All registered vehicles must have an active tax token
- Valid for 1 year (365 days) or custom period
- Must be renewed before expiry
- Expired vehicles cannot legally operate

**Renewal Process:**
1. User selects vehicle with expired/expiring tax token
2. Chooses renewal period (1-10 years, max 3650 days)
3. Pays renewal fee via SSLCommerz
4. System updates vehicle registration and tax token dates
5. QR codes continue working with same registration number

---

## 🗄️ Database Structure

### Tables Involved:
1. **`registered_vehicles`** - Main vehicle registration
   - `valid_until` - Registration expiry date
   - `status` - 'active', 'suspended', or 'expired'

2. **`tax_tokens`** - Tax token records
   - `valid_until` - Token expiry date
   - `status` - 'active' or 'expired'

3. **`tax_token_renewals`** - Renewal history
   - `renewal_number` - Unique renewal ID
   - `old_expiry_date` - Previous expiry
   - `new_expiry_date` - New expiry after renewal
   - `renewal_days` - Days extended

4. **`payments`** - Payment records
   - `payment_type` = 'tax_token_renewal'
   - `vehicle_id` - Links to vehicle

---

## 🧪 STEP-BY-STEP TESTING

### Step 1: Check Current Vehicles

Run this query to see all registered vehicles and their expiry status:

```sql
-- View all registered vehicles with expiry info
SELECT 
    rv.id as vehicle_id,
    rv.registration_number,
    rv.registration_plate,
    rv.vehicle_name,
    rv.model,
    rv.owner_name_en,
    rv.registration_date,
    rv.valid_until as registration_expiry,
    rv.status as vehicle_status,
    CASE 
        WHEN rv.valid_until < CURRENT_DATE THEN '❌ EXPIRED'
        WHEN rv.valid_until < CURRENT_DATE + INTERVAL '30 days' THEN '⚠️ EXPIRING SOON'
        ELSE '✅ ACTIVE'
    END as expiry_status,
    CURRENT_DATE - rv.valid_until as days_overdue,
    tt.token_number,
    tt.valid_until as token_expiry,
    tt.status as token_status
FROM registered_vehicles rv
LEFT JOIN tax_tokens tt ON tt.registered_vehicle_id = rv.id
ORDER BY rv.valid_until ASC;
```

**Expected Output:**
- List of all vehicles
- Expiry dates and status
- Shows which vehicles need renewal

---

### Step 2: Expire a Vehicle for Testing

To test renewal, manually expire a vehicle:

```sql
-- TESTING: Expire a specific vehicle
-- Replace 'YOUR_VEHICLE_ID' with actual vehicle ID from Step 1

UPDATE registered_vehicles 
SET 
    valid_until = CURRENT_DATE - INTERVAL '10 days',
    status = 'expired'
WHERE id = 'YOUR_VEHICLE_ID';

UPDATE tax_tokens 
SET 
    valid_until = CURRENT_DATE - INTERVAL '10 days',
    status = 'expired'
WHERE registered_vehicle_id = 'YOUR_VEHICLE_ID';

-- Verify the change
SELECT 
    registration_number,
    vehicle_name,
    valid_until,
    status,
    CURRENT_DATE - valid_until as days_expired
FROM registered_vehicles
WHERE id = 'YOUR_VEHICLE_ID';
```

**Expected Output:**
```
registration_number | vehicle_name    | valid_until | status  | days_expired
DHA-BA-12-3456     | Toyota Corolla  | 2024-11-25  | expired | 10
```

---

### Step 3: Test Frontend Renewal Flow

#### A. Login and Navigate
1. Login as the user who owns the vehicle
2. Go to **Dashboard** → **Vehicle Registration** tab
3. Find the expired vehicle card

#### B. Check Vehicle Card UI
The expired vehicle should show:
- ❌ Red "EXPIRED" badge
- Orange "Renew Tax Token" button (instead of green "View Token")
- Warning icon and message

#### C. Open Renewal Modal
1. Click "Renew Tax Token" button
2. Modal should display:
   - Vehicle details (name, model, registration number)
   - Current status: EXPIRED
   - Expired on: [date]
   - Renewal period slider (1-10 years, default 1 year)
   - Fee calculation based on days
   - Total amount display

#### D. Complete Payment
1. Select renewal period (e.g., 1 year = 365 days)
2. Click "Proceed to Payment"
3. Frontend creates payment record
4. Redirects to SSLCommerz (sandbox)
5. Complete test payment
6. Redirected back to dashboard

#### E. Verify Update
After payment success:
- Vehicle card should show "ACTIVE" status
- Green checkmark icon
- New expiry date displayed
- "View Tax Token" button appears

---

### Step 4: Verify Database Updates

After completing payment, run these queries:

#### A. Check Vehicle Update
```sql
-- Verify vehicle was renewed
SELECT 
    rv.registration_number,
    rv.vehicle_name,
    rv.valid_until as new_expiry,
    rv.status,
    rv.updated_at as last_updated
FROM registered_vehicles rv
WHERE id = 'YOUR_VEHICLE_ID';
```

**Expected Output:**
```
registration_number | vehicle_name    | new_expiry  | status | last_updated
DHA-BA-12-3456     | Toyota Corolla  | 2025-12-05  | active | 2024-12-05 08:30:00
```

#### B. Check Tax Token Update
```sql
-- Verify tax token was renewed
SELECT 
    tt.token_number,
    tt.issue_date as new_issue_date,
    tt.valid_until as new_expiry,
    tt.status,
    tt.updated_at
FROM tax_tokens tt
WHERE registered_vehicle_id = 'YOUR_VEHICLE_ID';
```

**Expected Output:**
```
token_number  | new_issue_date | new_expiry  | status | updated_at
TT-2024-123456| 2024-12-05    | 2025-12-05  | active | 2024-12-05 08:30:00
```

#### C. Check Renewal Record Created
```sql
-- View renewal history
SELECT 
    ttr.renewal_number,
    ttr.renewal_days,
    ttr.old_expiry_date,
    ttr.new_expiry_date,
    ttr.amount_paid,
    ttr.status,
    ttr.created_at,
    rv.registration_number,
    rv.vehicle_name
FROM tax_token_renewals ttr
JOIN registered_vehicles rv ON rv.id = ttr.vehicle_id
WHERE ttr.vehicle_id = 'YOUR_VEHICLE_ID'
ORDER BY ttr.created_at DESC;
```

**Expected Output:**
```
renewal_number | renewal_days | old_expiry  | new_expiry  | amount_paid | status | vehicle
TRN-2024-000123| 365         | 2024-11-25  | 2025-12-05  | 1500.00    | active | DHA-BA-12-3456
```

#### D. Check Payment Record
```sql
-- Verify payment was recorded
SELECT 
    p.tran_id,
    p.payment_type,
    p.amount,
    p.status,
    p.renewal_days,
    p.created_at,
    rv.registration_number
FROM payments p
JOIN registered_vehicles rv ON rv.id = p.vehicle_id
WHERE p.vehicle_id = 'YOUR_VEHICLE_ID'
AND p.payment_type = 'tax_token_renewal'
ORDER BY p.created_at DESC
LIMIT 1;
```

**Expected Output:**
```
tran_id         | payment_type        | amount  | status  | renewal_days | registration
TTREN1733395200 | tax_token_renewal   | 1500.00 | success | 365         | DHA-BA-12-3456
```

---

### Step 5: Test Multiple Renewals

Test renewing the same vehicle multiple times:

```sql
-- Expire the vehicle again
UPDATE registered_vehicles 
SET valid_until = CURRENT_DATE - INTERVAL '5 days'
WHERE id = 'YOUR_VEHICLE_ID';

UPDATE tax_tokens 
SET valid_until = CURRENT_DATE - INTERVAL '5 days'
WHERE registered_vehicle_id = 'YOUR_VEHICLE_ID';
```

Then repeat Steps 3 and 4. This time:
- Renewal history should show 2+ entries
- Each renewal should have unique `renewal_number`
- Dates should compound correctly

---

### Step 6: Test Different Renewal Periods

Test various renewal periods:

#### 1 Year (365 days) - Most Common
```sql
-- After renewal, check:
SELECT 
    new_expiry_date - old_expiry_date as days_added
FROM tax_token_renewals
WHERE id = 'LATEST_RENEWAL_ID';
-- Should return: 365
```

#### 2 Years (730 days)
```sql
-- Renewal with 730 days should add exactly 2 years
```

#### Custom Period (e.g., 180 days)
```sql
-- Test partial year renewal
```

---

### Step 7: Test Edge Cases

#### A. Already Active Vehicle
Try to renew a vehicle that's not expired:

```sql
-- Set vehicle to expire in future
UPDATE registered_vehicles 
SET 
    valid_until = CURRENT_DATE + INTERVAL '6 months',
    status = 'active'
WHERE id = 'YOUR_VEHICLE_ID';
```

**Expected Behavior:**
- Frontend should still allow renewal
- New expiry = Current expiry + renewal days
- No gap in validity

#### B. Far Expired Vehicle
Test renewing a vehicle expired for long time:

```sql
-- Expire vehicle 1 year ago
UPDATE registered_vehicles 
SET valid_until = CURRENT_DATE - INTERVAL '1 year'
WHERE id = 'YOUR_VEHICLE_ID';
```

**Expected Behavior:**
- Renewal starts from TODAY (not old expiry)
- New expiry = Today + renewal days
- User doesn't lose time from expiry gap

#### C. Maximum Renewal Period
Test 10-year renewal (3650 days):

**Expected:**
- Frontend slider allows up to 3650 days
- Database accepts 10-year period
- Fee calculated correctly

---

## 📊 Complete Test Checklist

### Database
- [ ] Vehicle `valid_until` updated correctly
- [ ] Vehicle `status` changed to 'active'
- [ ] Tax token `valid_until` updated
- [ ] Tax token `status` changed to 'active'
- [ ] Renewal record created in `tax_token_renewals`
- [ ] Payment record with `payment_type='tax_token_renewal'`
- [ ] Correct `renewal_days` stored
- [ ] Unique `renewal_number` generated

### Frontend
- [ ] Expired vehicles show "Renew" button
- [ ] Active vehicles show "View Token" button
- [ ] Renewal modal displays correct vehicle info
- [ ] Slider works (1-10 years)
- [ ] Fee calculation accurate
- [ ] Payment integration works
- [ ] Success message displayed
- [ ] Vehicle card updates after renewal
- [ ] New expiry date shown

### Backend
- [ ] `/api/tax-tokens/renewal/initiate` creates payment
- [ ] `/api/tax-tokens/renewal/process` updates database
- [ ] `process_tax_token_renewal()` function works
- [ ] Notifications sent to user
- [ ] Notifications sent to admin
- [ ] Error handling for failed payments

---

## 🔍 Debugging Queries

### Find All Expired Vehicles
```sql
SELECT 
    registration_number,
    vehicle_name,
    owner_name_en,
    valid_until,
    CURRENT_DATE - valid_until as days_overdue
FROM registered_vehicles
WHERE valid_until < CURRENT_DATE
ORDER BY valid_until ASC;
```

### View Renewal History for All Vehicles
```sql
SELECT 
    rv.registration_number,
    rv.vehicle_name,
    ttr.renewal_number,
    ttr.old_expiry_date,
    ttr.new_expiry_date,
    ttr.renewal_days,
    ttr.amount_paid,
    ttr.created_at,
    p.status as payment_status
FROM tax_token_renewals ttr
JOIN registered_vehicles rv ON rv.id = ttr.vehicle_id
LEFT JOIN payments p ON p.id = ttr.payment_id
ORDER BY ttr.created_at DESC
LIMIT 20;
```

### Check Payment Processing
```sql
SELECT 
    p.tran_id,
    p.payment_type,
    p.status,
    p.amount,
    p.renewal_days,
    rv.registration_number,
    ttr.renewal_number,
    ttr.new_expiry_date
FROM payments p
LEFT JOIN registered_vehicles rv ON rv.id = p.vehicle_id
LEFT JOIN tax_token_renewals ttr ON ttr.payment_id = p.id
WHERE p.payment_type = 'tax_token_renewal'
ORDER BY p.created_at DESC
LIMIT 10;
```

### Find Orphaned Payments (Success but no renewal)
```sql
SELECT 
    p.tran_id,
    p.created_at,
    p.amount,
    rv.registration_number,
    ttr.id as renewal_id
FROM payments p
LEFT JOIN registered_vehicles rv ON rv.id = p.vehicle_id
LEFT JOIN tax_token_renewals ttr ON ttr.payment_id = p.id
WHERE p.payment_type = 'tax_token_renewal'
AND p.status = 'success'
AND ttr.id IS NULL;
```

---

## 🛠️ Manual Fix if Renewal Fails

If a payment succeeds but renewal doesn't process:

```sql
-- Manual renewal processing
-- Replace variables with actual values

DO $$
DECLARE
    v_payment_id UUID := 'PAYMENT_ID_HERE';
    v_vehicle_id UUID := 'VEHICLE_ID_HERE';
    v_user_id UUID := 'USER_ID_HERE';
    v_renewal_days INTEGER := 365;
    v_amount NUMERIC := 1500.00;
    v_old_expiry DATE;
    v_new_expiry DATE;
    v_renewal_id UUID;
    v_renewal_number TEXT;
BEGIN
    -- Get current expiry
    SELECT valid_until INTO v_old_expiry
    FROM registered_vehicles
    WHERE id = v_vehicle_id;
    
    -- Calculate new expiry
    IF v_old_expiry < CURRENT_DATE THEN
        v_new_expiry := CURRENT_DATE + (v_renewal_days || ' days')::INTERVAL;
    ELSE
        v_new_expiry := v_old_expiry + (v_renewal_days || ' days')::INTERVAL;
    END IF;
    
    -- Generate renewal number
    v_renewal_number := 'TRN-' || TO_CHAR(NOW(), 'YYYY') || '-' || 
                        LPAD((SELECT COUNT(*) + 1 FROM tax_token_renewals)::TEXT, 6, '0');
    
    -- Create renewal record
    INSERT INTO tax_token_renewals (
        vehicle_id, user_id, payment_id, renewal_number,
        renewal_days, amount_paid, old_expiry_date, new_expiry_date, status
    ) VALUES (
        v_vehicle_id, v_user_id, v_payment_id, v_renewal_number,
        v_renewal_days, v_amount, v_old_expiry, v_new_expiry, 'active'
    ) RETURNING id INTO v_renewal_id;
    
    -- Update vehicle
    UPDATE registered_vehicles
    SET valid_until = v_new_expiry, status = 'active', updated_at = NOW()
    WHERE id = v_vehicle_id;
    
    -- Update tax token
    UPDATE tax_tokens
    SET valid_until = v_new_expiry, status = 'active', updated_at = NOW()
    WHERE registered_vehicle_id = v_vehicle_id;
    
    RAISE NOTICE 'Manual renewal completed: % (New expiry: %)', v_renewal_number, v_new_expiry;
END $$;
```

---

## 📝 Test Scenarios Summary

| Scenario | Setup | Expected Result |
|----------|-------|-----------------|
| **Expired Vehicle** | `valid_until < today` | Renewal starts from today |
| **Active Vehicle** | `valid_until > today` | Extends from current expiry |
| **1 Year Renewal** | 365 days | Adds exactly 1 year |
| **Multiple Renewals** | Renew 2+ times | All records in history |
| **Payment Failure** | Cancel payment | No database changes |
| **Payment Success** | Complete payment | All tables updated |

---

## ✅ Success Indicators

After successful renewal:
1. ✅ Vehicle status = 'active'
2. ✅ Tax token status = 'active'
3. ✅ New expiry dates updated
4. ✅ Renewal record created
5. ✅ Payment marked 'success'
6. ✅ User notification sent
7. ✅ Admin notification sent
8. ✅ QR code still works
9. ✅ Frontend shows active badge
10. ✅ Can view tax token again

---

## 🚨 Common Issues & Solutions

### Issue 1: "Vehicle not found" error
**Cause:** Vehicle doesn't belong to user
**Solution:** Check `user_id` matches in query

### Issue 2: Payment success but dates not updated
**Cause:** `process_tax_token_renewal()` function failed
**Solution:** Run manual fix script above

### Issue 3: Renewal record created but vehicle still expired
**Cause:** `UPDATE` statements failed
**Solution:** Check for RLS policies blocking updates

### Issue 4: Cannot renew more than 730 days
**Cause:** Old constraint in database
**Solution:** Update constraint to allow 3650 days

---

## 📞 Need Help?

If renewal isn't working:
1. Run all debugging queries
2. Check backend console logs
3. Verify `process_tax_token_renewal()` function exists
4. Ensure `tax_token_renewals` table has correct columns
5. Check payment record has `payment_type='tax_token_renewal'`

---

**Created:** December 5, 2025
**Status:** ✅ Ready for Testing
**Last Updated:** December 5, 2025
