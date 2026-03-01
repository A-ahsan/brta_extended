# 🧪 SMS Testing Guide - Quick Steps

## Before Testing

### 1. Make sure backend is running
```powershell
cd backend
node server.js
```
You should see: `🚀 Backend server running on https://localhost:5000`

---

## 🎯 How to Test from Website

### Step 1: Prepare a Test User
1. Go to **Supabase Dashboard**: https://supabase.com
2. Click your project → **Authentication** → **Users**
3. Pick any user (or create one)
4. **IMPORTANT**: Make sure user has a phone number
   - Click the user → Edit User
   - In **Phone** field, enter: `01712345678` (or any valid number)
   - Format can be: `01712345678` OR `8801712345678` OR `+8801712345678`
   - All formats work! The system auto-converts to `8801712345678` for API
5. Copy the **User ID** (UUID) - you'll need this

### Step 2: Register a Vehicle for That User
1. Login to your website as that user
2. Apply for a driving license (if not done)
3. Register a vehicle
4. Complete the registration process
5. You should now have a vehicle with a QR code

### Step 3: Login as Police Officer
1. Logout from user account
2. Go to: `https://localhost:3000/police-login`
3. Login with police credentials
4. You should see Police Dashboard

### Step 4: Add a Violation (This will trigger SMS!)
1. On Police Dashboard, click **"Verification"** (or **"QR Scan"**)
2. **Option A - Scan QR Code:**
   - Click "Scan QR Code"
   - Allow camera permission
   - Scan the vehicle's QR code
   
   **Option B - Manual Search:**
   - Enter vehicle registration number (e.g., `DHAKA-METRO-GA-12-3456`)
   - Click search

3. Once vehicle loads, click **"Add Violation"** button

4. Fill in violation details:
   - **Violation Type**: Select any (e.g., "Over Speeding")
   - **Location**: Click "Get Current Location" or type manually
   - **Additional Charges**: Leave as 0 (optional)
   - Click **Submit**

### Step 5: Check Results
**You should see 3 things:**

1. ✅ **Toast notification**: "Violation added successfully!"
2. ✅ **Backend console log**:
   ```
   📱 Sending SMS to: 8801712345678 (original: 01712345678)
   ✅ SMS sent successfully to: 8801712345678
   ```
3. ✅ **SMS on user's phone** (within 1-2 minutes):
   ```
   **TEST MESSAGE**
   BRTA Fine Alert!
   Fine #VIO-2025-123456
   Reason: Over Speeding
   Amount: 2000.00 BDT
   Visit BRTA 2.0 to pay
   ```

---

## 🔧 Alternative: Direct API Test

If you want to test without adding a real violation:

```powershell
# Replace YOUR-USER-ID with actual UUID from Supabase
$body = @{
    userId = 'YOUR-USER-ID-HERE'
    violationNumber = 'VIO-TEST-001'
    violationName = 'Test Speeding'
    amount = '1500.00'
    websiteUrl = 'https://brta.gov.bd'
} | ConvertTo-Json

Invoke-RestMethod -Uri 'https://localhost:5000/api/violations/send-sms' `
    -Method POST `
    -ContentType 'application/json' `
    -Body $body `
    -SkipCertificateCheck
```

**Expected Response:**
```json
{
  "success": true,
  "message": "SMS sent successfully",
  "phoneNumber": "880****5678"
}
```

---

## 📱 Phone Number Formats - All Work!

The system automatically handles these formats:

| User Enters | System Converts To | API Sends |
|-------------|-------------------|-----------|
| `01712345678` | `8801712345678` | ✅ Works |
| `8801712345678` | `8801712345678` | ✅ Works |
| `+8801712345678` | `8801712345678` | ✅ Works |
| `017 1234 5678` | `8801712345678` | ✅ Works |

---

## 🎯 Expected SMS Content

```
**TEST MESSAGE**
BRTA Fine Alert!
Fine #VIO-2025-123456
Reason: Over Speeding
Amount: 2000.00 BDT
Visit BRTA 2.0 to pay
```

**Note**: The "**TEST MESSAGE**" prefix will appear at the top so you know it's a test.

---

## ❌ Troubleshooting

### "User phone number not found"
- Go to Supabase → Authentication → Users
- Click the user → Add phone number
- Format: `01712345678` or `+8801712345678`

### "Invalid phone number format"
- Phone must be 11 digits (01XXXXXXXXX) or 13 digits (8801XXXXXXXXX)
- Check backend console for exact error

### SMS not received after 2 minutes
1. Check backend console - did it say "✅ SMS sent successfully"?
2. If yes, check BulkSMSBD balance:
   - Visit: http://bulksmsbd.net/api/getBalanceApi?api_key=WUc2EjFMY7abkO72ojC5
3. Verify phone number is correct in Supabase
4. SMS might be delayed - wait 5 minutes

### Backend not running
```powershell
cd backend
node server.js
```

---

## ✅ Quick Checklist

- [ ] Backend running (`node server.js`)
- [ ] User has phone number in Supabase Auth
- [ ] User has a registered vehicle
- [ ] Logged in as police officer
- [ ] Added violation via Police Dashboard
- [ ] Checked backend console for SMS log
- [ ] Waited 1-2 minutes for SMS delivery

---

## 🎉 Success Indicators

1. **Backend Console Shows:**
   ```
   📱 Sending SMS to: 8801712345678 (original: 01712345678)
   ✅ SMS sent successfully to: 8801712345678
   ```

2. **API Returns:**
   ```json
   { "success": true, "message": "SMS sent successfully" }
   ```

3. **Phone Receives SMS:**
   ```
   **TEST MESSAGE**
   BRTA Fine Alert!
   Fine #VIO-2025-123456
   ...
   ```

---

**Need help?** Check `SMS_NOTIFICATION_SETUP.md` for detailed documentation.
