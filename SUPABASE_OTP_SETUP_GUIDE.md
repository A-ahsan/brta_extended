# 🚀 Supabase Edge Functions OTP Setup Guide

## ⚡ **Super Quick Setup (Copy-Paste Commands)**

**You DON'T need to:**
- ❌ Run SQL manually
- ❌ Configure email servers
- ❌ Pay for any service

**Just run these 6 commands:**

```powershell
# 1. Install Supabase CLI (one-time)
iwr -useb get.scoop.sh | iex
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# 2. Login to Supabase
supabase login

# 3. Go to your project
cd D:\My_Project\brta_extended

# 4. Link project (get YOUR_PROJECT_ID from Supabase dashboard URL)
supabase link --project-ref YOUR_PROJECT_ID

# 5. Create database table (THIS RUNS THE SQL FOR YOU!)
supabase db push

# 6. Deploy the function
supabase functions deploy send-otp --no-verify-jwt
```

**After deployment, you'll see:**
```
Function URL: https://YOUR_PROJECT_ID.supabase.co/functions/v1/send-otp
```

**Add this URL to `.env`:**
```env
VITE_SUPABASE_FUNCTION_URL=https://YOUR_PROJECT_ID.supabase.co/functions/v1/send-otp
```

**Done!** 🎉

---

## 🎯 **How It Works**

### **OTP Lifecycle:**

1. **User Requests OTP** → Backend calls Edge Function
2. **Edge Function**:
   - Generates random 6-digit code
   - Stores in `password_reset_otps` table with:
     - `email`: User's email
     - `otp_code`: The 6-digit code
     - `expires_at`: Current time + 10 minutes
     - `attempts`: 0
   - Sends beautiful email via Supabase
3. **User Enters OTP** → Backend verifies from database
4. **Verification**:
   - ✅ **If correct**: Delete OTP from database (one-time use)
   - ❌ **If wrong**: Increment attempts counter
   - ❌ **If 5 wrong attempts**: Delete OTP
   - ⏰ **If expired**: Delete OTP
5. **Database Auto-Cleanup**: Expired OTPs removed hourly

### **Expiry System:**
- OTP valid for **10 minutes** from creation
- Stored as `expires_at` timestamp in database
- Verify function checks: `if (now > expires_at)` → Invalid
- Auto-deleted after expiry

### **For Signup OTP:**
**YES, same system works for signup!**

**In your signup flow:**
```javascript
// 1. User enters email
const email = userEmail;

// 2. Call Edge Function (same one!)
const response = await fetch(SUPABASE_FUNCTION_URL, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
  },
  body: JSON.stringify({ email, language: 'en' })
});

// 3. User gets email with OTP
// 4. User enters OTP
// 5. Verify OTP (backend calls verifyOTP function)
// 6. If valid → Create user account
// 7. OTP automatically deleted after verification
```

**Same for:**
- Password reset ✅
- Signup verification ✅
- Email verification ✅  
- Two-factor auth ✅

---

## 📊 **Database & Expiry Explained**

### **Table Structure:**
```sql
password_reset_otps
├── id (UUID)
├── email (TEXT) ← User's email
├── otp_code (TEXT) ← 6-digit code
├── expires_at (TIMESTAMPTZ) ← Expiry time
├── attempts (INTEGER) ← Failed attempts
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)
```

### **Auto-Deletion Happens When:**
1. ✅ **OTP verified correctly** → Immediate deletion
2. ❌ **5 wrong attempts** → Immediate deletion  
3. ⏰ **10 minutes passed** → Deleted by verify function
4. 🧹 **Hourly cleanup** → Database trigger removes expired

### **You DON'T manually delete - it's automatic!**

---

## ✅ **What You Need to Do After Implementation**

### **Step 1: Install Supabase CLI** (5 minutes)

#### **Windows (PowerShell):**
```powershell
# Install Scoop (package manager) if you don't have it
iwr -useb get.scoop.sh | iex

# Install Supabase CLI
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

#### **Verify Installation:**
```powershell
supabase --version
```

---

### **Step 2: Login to Supabase** (2 minutes)

```powershell
supabase login
```

This will open a browser window. Login with your Supabase account.

---

### **Step 3: Link Your Project** (1 minute)

```powershell
cd D:\My_Project\brta_extended
supabase link --project-ref YOUR_PROJECT_ID
```

**How to get YOUR_PROJECT_ID:**
1. Go to https://supabase.com/dashboard
2. Open your BRTA project
3. Look at the URL: `https://supabase.com/dashboard/project/YOUR_PROJECT_ID`
4. Copy that ID

---

### **Step 4: Create Database Table** (1 minute)

```powershell
# Run the migration to create OTP table
supabase db push
```

This creates the `password_reset_otps` table in your database.

---

### **Step 5: Deploy the Edge Function** (2 minutes)

```powershell
# Deploy the send-otp function
supabase functions deploy send-otp --no-verify-jwt
```

**Expected output:**
```
Deploying Function...
Deployed supabase/functions/send-otp successfully!
Function URL: https://YOUR_PROJECT_ID.supabase.co/functions/v1/send-otp
```

---

### **Step 6: Get Function URL** (1 minute)

After deployment, you'll see the URL. It looks like:
```
https://YOUR_PROJECT_ID.supabase.co/functions/v1/send-otp
```

Copy this URL!

---

### **Step 7: Update Environment Variables** (2 minutes)

Add this to your `.env` file (both local and Render):

```env
# Supabase Edge Function
VITE_SUPABASE_FUNCTION_URL=https://YOUR_PROJECT_ID.supabase.co/functions/v1/send-otp
```

**On Render.com:**
1. Go to your backend service
2. Environment → Add Environment Variable
3. Key: `VITE_SUPABASE_FUNCTION_URL`
4. Value: Your function URL
5. Click "Save Changes"

---

### **Step 8: Configure Email in Supabase** (3 minutes)

1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to **Authentication** → **Email Templates**
4. Scroll down to **SMTP Settings**
5. Click **Enable Custom SMTP** (optional - uses Supabase's default if not set)

**Default behavior:**
- Supabase sends from `noreply@mail.app.supabase.io`
- Works immediately, no configuration needed
- FREE unlimited emails

**Optional - Use your own domain:**
- Add your SMTP settings (Gmail, SendGrid, etc.)
- But not needed for testing!

---

### **Step 9: Test the Function** (2 minutes)

```powershell
# Test the function
curl -X POST https://YOUR_PROJECT_ID.supabase.co/functions/v1/send-otp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d "{\"email\":\"test@example.com\",\"language\":\"en\"}"
```

**Get YOUR_ANON_KEY:**
- Supabase Dashboard → Settings → API
- Copy "anon public" key

---

### **Step 10: Verify Database** (1 minute)

1. Go to Supabase Dashboard → **Table Editor**
2. Find `password_reset_otps` table
3. You should see the OTP record created

---

## 🎯 **After All Steps Complete**

### **What Works Now:**
✅ Unlimited FREE OTP emails via Supabase
✅ No more SMTP connection errors on Render
✅ No more Resend free tier limitations
✅ OTPs stored securely in database
✅ Auto-expiry after 10 minutes
✅ Bilingual email templates (EN/BN)

### **How It Works:**
1. User requests password reset
2. Frontend calls your backend `/api/auth/forgot-password`
3. Backend calls Supabase Edge Function
4. Edge Function:
   - Generates 6-digit OTP
   - Stores in database with expiry
   - Sends email using Supabase
5. User receives email with OTP
6. User enters OTP
7. Backend verifies OTP from database

---

## 🐛 **Troubleshooting**

### **"Command not found: supabase"**
- Restart PowerShell after installation
- Or use: `scoop install supabase`

### **"Project linking failed"**
- Make sure you're logged in: `supabase login`
- Check project ID is correct
- Try: `supabase projects list` to see all projects

### **"Function deployment failed"**
- Check you're in the right directory
- Verify file exists: `supabase\functions\send-otp\index.ts`
- Try: `supabase functions serve send-otp` to test locally

### **"Email not sending"**
- Check Supabase Dashboard → Authentication → Settings
- Ensure email sending is enabled
- Check spam folder
- Verify Supabase project is not paused

### **"Database table not found"**
- Run: `supabase db push` again
- Check migrations folder exists
- Manually create table in Supabase SQL Editor

---

## 📝 **Quick Command Reference**

```powershell
# Login
supabase login

# Link project
supabase link --project-ref YOUR_PROJECT_ID

# Push database changes
supabase db push

# Deploy function
supabase functions deploy send-otp --no-verify-jwt

# Test function locally
supabase functions serve send-otp

# View function logs
supabase functions logs send-otp

# List all functions
supabase functions list
```

---

## ✅ **Verification Checklist**

- [ ] Supabase CLI installed
- [ ] Logged into Supabase
- [ ] Project linked
- [ ] Database table created (`password_reset_otps`)
- [ ] Edge function deployed
- [ ] Environment variable added (local + Render)
- [ ] Function URL copied
- [ ] Test email sent successfully
- [ ] OTP record visible in database

---

## 🎉 **You're Done!**

### **What Happens Now:**

**When user requests OTP:**
1. Your backend → Calls Edge Function
2. Edge Function → Generates OTP → Saves to database → Sends email
3. Database → Stores OTP with 10-minute expiry

**When user enters OTP:**
1. Your backend → Checks database
2. If correct → ✅ Deletes OTP → Allows password reset
3. If wrong → ❌ Increments attempts (max 5)
4. If expired → ⏰ Deletes OTP → Shows error

### **Q&A:**

**Q: Do I need to run the SQL file manually?**  
A: NO! `supabase db push` runs it for you

**Q: Will OTP be deleted after use?**  
A: YES! Auto-deleted on correct verification

**Q: Can I use this for signup?**  
A: YES! Same Edge Function for everything

**Q: What if 10 minutes pass?**  
A: Verify function checks expiry, auto-deletes if expired

**Q: Is it really FREE?**  
A: YES! Supabase free tier = unlimited emails

**Q: Do I need to configure email?**  
A: NO! Supabase sends from their domain automatically

---

Your OTP system is now:
- 100% FREE (no paid services)
- Unlimited emails
- Works on Render (no SMTP blocking)
- Professionally designed emails
- Bilingual support
- Secure database storage
- Auto-cleanup & expiry
- Works for signup AND password reset

**Total Setup Time:** ~15-20 minutes

**Need Help?** Check the troubleshooting section or run:
```powershell
supabase functions logs send-otp --tail
```
To see real-time logs!
