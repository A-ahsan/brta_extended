# 🚨 Traffic Violations & Fines System - Complete Setup Guide

## ✅ Overview

A comprehensive **Bangla Mamla (Traffic Fine) System** integrated into your BRTA project with:

- **Police Interface**: Add violations via search/QR scan
- **User Interface**: View violations and pay fines online
- **Public Verification**: Display violations when scanning vehicle QR codes
- **Bilingual Support**: Full English & Bengali language support
- **SSL Commerz Integration**: Secure online payment for fines
- **Real-time Notifications**: Bilingual notifications for users and police

---

## 📋 Features Implemented

### For Police Officers 👮
✅ **Add Traffic Violations** (Mamla) after scanning vehicle or searching  
✅ **15 Pre-defined Violation Types** with different severity levels  
✅ **Customizable Fine Amounts** with additional charges option  
✅ **Location Tracking** (English & Bengali)  
✅ **Evidence Upload** (photo/video support)  
✅ **Internal Notes** for police records  
✅ **Real-time Notifications** on violation creation  
✅ **View Violation History** when checking any vehicle  

### For Users 🚗
✅ **My Violations Page** in dashboard sidebar  
✅ **Filter by Status** (All, Paid, Unpaid)  
✅ **Detailed Violation Information**  
✅ **Pay Fines Online** via SSL Commerz  
✅ **Violation Notifications** (bilingual)  
✅ **Payment History** tracking  
✅ **Summary Statistics** (total violations, pending amount, paid amount)  

### For Public 🌐
✅ **View Violations** when verifying vehicles publicly  
✅ **QR Code Scan** shows complete vehicle info + violations  
✅ **Real-time Status** (paid/unpaid fines)  
✅ **Transparency** for public to verify vehicle violation status  

---

## 🗄️ Database Setup

### Step 1: Run Database Schema

Execute the SQL file in your Supabase SQL Editor:

```bash
# File location:
database/violations_fines_system.sql
```

**This creates:**
- ✅ `violation_types` - 15 pre-defined traffic violations
- ✅ `traffic_violations` - Individual violation records
- ✅ `violation_history` - Aggregated violation stats per vehicle
- ✅ Functions for auto-generating violation numbers
- ✅ Triggers for updating violation history
- ✅ RLS policies for security
- ✅ Indexes for performance

### Step 2: Verify Tables Created

Check in Supabase Table Editor:

```
☑️ violation_types (15 rows should exist)
☑️ traffic_violations (empty, will fill as police add violations)
☑️ violation_history (empty, auto-populated)
```

---

## 🎨 Frontend Components

### New Components Created

1. **`AddViolationModal.jsx`** - Police interface to add violations
   - Location: `src/components/AddViolationModal.jsx`
   - Features: Violation type selection, location, amount, evidence

2. **`UserViolations.jsx`** - User violations dashboard page
   - Location: `src/pages/UserViolations.jsx`
   - Features: List violations, filter, pay fines, view details

### Updated Components

3. **`PoliceVerification.jsx`** - Added violations display & "Add Fine" button
   - Shows violations when viewing vehicles
   - Fetches and displays violation history
   - Add violation modal integration

4. **`UserDashboard.jsx`** - Added "My Violations" menu item
   - New sidebar menu: "My Violations" / "আমার লঙ্ঘন"
   - Routes to UserViolations page

5. **`PublicVehicleVerification.jsx`** - Display violations publicly
   - Shows violations when public scans QR codes
   - Real-time paid/unpaid status

---

## 🔔 Backend & Notifications

### Updated Files

**`backend/notifications.js`** - Added violation notification functions:
- `sendViolationNotification()` - Notify user when fine issued
- `sendPoliceViolationConfirmation()` - Confirm to police officer

**Notification Flow:**
1. Police adds violation → User receives bilingual notification
2. Police receives confirmation notification
3. User pays fine → Payment success notification

---

## 🚀 How to Use the System

### For Police Officers

#### 1. Search or Scan Vehicle
```
Police Dashboard → Verification → Search or QR Scan
```

#### 2. View Vehicle Details
- Vehicle info loads
- **NEW**: Violations section appears showing:
  - Total violations for this vehicle
  - Paid vs Unpaid fines
  - Violation history

#### 3. Add a Violation/Fine
```
Click "Add Fine" button (জরিমানা যোগ করুন)
```

**Steps:**
1. Select **Violation Type** from 15 options:
   - Over Speeding (অতিরিক্ত গতি) - BDT 2,000
   - No License (লাইসেন্স ছাড়া) - BDT 5,000
   - No Helmet (হেলমেট ছাড়া) - BDT 500
   - Signal Violation (সংকেত লঙ্ঘন) - BDT 1,500
   - Wrong Side Driving (ভুল পাশে চালানো) - BDT 3,000
   - ... and 10 more types

2. Enter **Location** (English & Bengali):
   - Example: "Gulshan-2 Circle" / "গুলশান-২ সার্কেল"

3. Add **Additional Charges** (if any):
   - Optional extra amount

4. Enter **Description**:
   - Details about the violation

5. Add **Internal Notes** (police only):
   - Officer observations

6. Click **Add Violation**

**Result:**
- ✅ Violation recorded in database
- ✅ User receives notification (bilingual)
- ✅ Police receives confirmation
- ✅ Fine shows as "Unpaid" in user's account

---

### For Users

#### 1. Access My Violations
```
User Dashboard → Sidebar → "My Violations" (আমার লঙ্ঘন)
```

#### 2. View Violations
**Summary Cards show:**
- Total Violations count
- Pending Payment amount
- Total Paid amount

**Filters:**
- All Violations
- Unpaid
- Paid

#### 3. Pay a Fine
```
Click "Pay Fine" button on any unpaid violation
```

**Payment Flow:**
1. Click **"Pay Fine"** (জরিমানা পরিশোধ করুন)
2. Redirects to **SSL Commerz** payment gateway
3. Complete payment (use test cards in sandbox)
4. Redirects back to dashboard
5. ✅ Violation marked as "Paid"
6. ✅ Notification sent

**Test Cards (SSL Commerz Sandbox):**
```
Card Number: 4532********1111
Expiry: Any future date
CVV: Any 3 digits
```

---

### For Public

#### Public Vehicle Verification
```
Navigate to: /verify-vehicle
```

**Features:**
1. **Search** by registration number
2. **Scan QR Code** from vehicle smart card
3. **View Complete Info** including:
   - Vehicle details
   - Owner details
   - Tax token status
   - **NEW: Violations & Fines**
     - Shows all violations
     - Paid/Unpaid status
     - Total pending amount

---

## 💳 Payment Integration

### SSL Commerz Configuration

The system uses your existing SSL Commerz integration.

**Fine Payment Flow:**
```
User clicks Pay Fine
  ↓
Payment record created (status: initiated)
  ↓
Backend /api/payment/initiate called
  ↓
User redirects to SSL Commerz
  ↓
Payment completed
  ↓
Callback to /api/payment/success
  ↓
Violation payment_status updated to 'paid'
  ↓
Notification sent to user
```

**Dynamic URL Support:**
- Works with `localhost:3000`
- Works with IP addresses (e.g., `192.168.1.100:3000`)
- Works with HTTPS
- Automatically detects and uses current protocol/host

---

## 🎯 Violation Types

### Pre-defined Violations (15 Types)

| Code | Name (English) | Name (Bengali) | Fine | Severity |
|------|---------------|----------------|------|----------|
| OVERSPEED | Over Speeding | অতিরিক্ত গতি | 2,000 | Moderate |
| NO_LICENSE | Driving Without License | লাইসেন্স ছাড়া গাড়ি চালানো | 5,000 | Severe |
| NO_HELMET | No Helmet | হেলমেট ছাড়া | 500 | Minor |
| RED_LIGHT | Signal Violation | সংকেত লঙ্ঘন | 1,500 | Moderate |
| WRONG_SIDE | Wrong Side Driving | ভুল পাশে চালানো | 3,000 | Severe |
| NO_PARKING | Illegal Parking | অবৈধ পার্কিং | 1,000 | Minor |
| DRUNK_DRIVE | Drunk Driving | মাতাল অবস্থায় | 10,000 | Critical |
| NO_SEATBELT | Not Using Seatbelt | সিটবেল্ট ব্যবহার না করা | 500 | Minor |
| MOBILE_USE | Mobile Phone Use | মোবাইল ব্যবহার | 1,000 | Moderate |
| NO_INSURANCE | No Valid Insurance | বৈধ বীমা নেই | 5,000 | Severe |
| EXPIRED_TAX | Expired Tax Token | মেয়াদোত্তীর্ণ ট্যাক্স | 3,000 | Severe |
| OVERLOAD | Overloading | অতিরিক্ত ওজন | 2,500 | Moderate |
| RASH_DRIVE | Rash Driving | বেপরোয়া চালানো | 5,000 | Severe |
| NO_REGISTRATION | No Registration Papers | নিবন্ধন কাগজ নেই | 2,000 | Moderate |
| POLLUTION | Excessive Pollution | অতিরিক্ত দূষণ | 1,500 | Moderate |

---

## 🔒 Security & Permissions

### Row Level Security (RLS)

**Violation Types:**
- ✅ Public can view active violation types
- ✅ Only admins can create/update/delete

**Traffic Violations:**
- ✅ Users can view only their own violations
- ✅ Police can view all violations
- ✅ Police can create violations
- ✅ Police can update violations they created
- ✅ Admins can manage all violations

**Violation History:**
- ✅ Users can view their own history
- ✅ Police/Admin can view all history

---

## 🧪 Testing Guide

### Test Scenario 1: Police Adds Fine

**Steps:**
1. Login as **Police Officer**
2. Go to **Police Verification**
3. Search for a registered vehicle (e.g., `REG20241234567`)
4. Click **"Add Fine"** button
5. Select **"Over Speeding"**
6. Enter location: **"Mirpur-10"** / **"মিরপুর-১০"**
7. Add additional charge: **500**
8. Click **Add Violation**

**Expected Result:**
- ✅ Violation appears in vehicle's violations list
- ✅ Total amount: BDT 2,500 (2,000 + 500)
- ✅ User receives notification
- ✅ Police receives confirmation

---

### Test Scenario 2: User Pays Fine

**Steps:**
1. Login as **Vehicle Owner** (user who received fine)
2. Go to **My Violations** from sidebar
3. See violation listed as **"Pending Payment"**
4. Click **"Pay Fine"** button
5. Complete payment on SSL Commerz (sandbox)
6. Return to dashboard

**Expected Result:**
- ✅ Violation status: **"Paid"**
- ✅ Green badge shows "পরিশোধিত"
- ✅ Payment record created
- ✅ Notification sent

---

### Test Scenario 3: Public Verification

**Steps:**
1. Go to `/verify-vehicle` (no login required)
2. Search for vehicle with violations
3. View vehicle details

**Expected Result:**
- ✅ "Violations & Fines" section visible
- ✅ Shows all violations with status
- ✅ Total pending amount displayed
- ✅ Paid violations marked green

---

## 📱 Bilingual Support

### All Text is Bilingual

**Menus:**
- My Violations / আমার লঙ্ঘন
- Add Fine / জরিমানা যোগ করুন
- Pay Fine / জরিমানা পরিশোধ করুন

**Notifications:**
- Title (English + Bengali)
- Message (English + Bengali)
- Auto-displays based on user's language preference

**Violation Names:**
- Stored in both languages
- Displays based on current language setting

---

## 🎨 UI/UX Features

### Modern Design
- ✅ Gradient backgrounds (red to orange for violations)
- ✅ Smooth animations (Framer Motion)
- ✅ Responsive layout (mobile-friendly)
- ✅ Dark mode support
- ✅ Icons from Phosphor Icons
- ✅ Color-coded severity (Critical=Red, Severe=Orange, etc.)

### User Experience
- ✅ Loading states with spinners
- ✅ Toast notifications
- ✅ Empty states with icons
- ✅ Filter buttons
- ✅ Summary cards
- ✅ One-click payment

---

## 🔧 Troubleshooting

### Issue: Violations Not Showing

**Solution:**
1. Check database table exists: `traffic_violations`
2. Verify RLS policies are enabled
3. Check user permissions
4. Check browser console for errors

---

### Issue: Payment Failing

**Solution:**
1. Verify backend server is running (port 5000)
2. Check SSL Commerz credentials in `.env`
3. Ensure using sandbox mode for testing
4. Check network tab for API errors

---

### Issue: Notifications Not Sending

**Solution:**
1. Check `notifications` table exists
2. Verify notification functions imported
3. Check Supabase service role key
4. Check backend logs

---

## 📊 Database Queries (For Admins)

### View All Violations
```sql
SELECT * FROM traffic_violations
ORDER BY violation_date DESC;
```

### View Unpaid Fines
```sql
SELECT 
  v.violation_number,
  v.violation_name_en,
  v.total_amount,
  v.violation_date,
  rv.registration_number
FROM traffic_violations v
JOIN registered_vehicles rv ON v.registered_vehicle_id = rv.id
WHERE v.payment_status = 'unpaid'
  AND v.status = 'active';
```

### Vehicle Violation Summary
```sql
SELECT 
  rv.registration_number,
  vh.total_violations,
  vh.total_fines_pending,
  vh.total_fines_paid
FROM violation_history vh
JOIN registered_vehicles rv ON vh.registered_vehicle_id = rv.id
ORDER BY vh.total_violations DESC;
```

---

## 🚀 Next Steps

### Optional Enhancements

1. **SMS Notifications** - Send SMS when fines are issued
2. **Payment Reminders** - Auto-remind users of unpaid fines
3. **Fine Appeals** - Allow users to appeal violations
4. **Admin Reports** - Violation statistics dashboard
5. **Export Data** - PDF/Excel export of violations
6. **Court Integration** - Connect with court systems
7. **Fine Discounts** - Early payment discounts
8. **Recurring Violators** - Flag repeat offenders

---

## ✅ System Status

**All Features Implemented:**
- ✅ Database schema with 3 tables
- ✅ 15 pre-defined violation types
- ✅ Police add violation interface
- ✅ User violations dashboard
- ✅ Public violation display
- ✅ SSL Commerz payment integration
- ✅ Bilingual notifications
- ✅ Full Bengali/English support
- ✅ RLS security policies
- ✅ Mobile responsive design
- ✅ Dark mode support

---

## 📞 Support

For issues or questions:
1. Check this guide first
2. Review console/network errors
3. Check Supabase logs
4. Verify database tables exist
5. Test with sample data

---

## 🎉 Congratulations!

Your BRTA system now has a **complete, bilingual, and secure traffic violations & fines management system** ready for your championship project!

**Key Highlights:**
- 🚨 Full Mamla (Fine) System
- 🌐 Works on localhost AND IP addresses
- 🔒 Secure with RLS policies
- 💳 Integrated payment gateway
- 📱 Fully bilingual (EN/BN)
- ✨ Modern UI/UX

**Ready to win! 🏆**
