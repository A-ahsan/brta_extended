# 🚀 Environment Setup - Add to Render/Vercel

## ✅ Your Edge Function is Deployed!

**Function URL:**
```
https://tcqatmkqmvaseakicqkr.supabase.co/functions/v1/send-otp
```

---

## 📋 **What You Need to Do Now**

### **Step 1: Get Your Supabase Anon Key** (30 seconds)

1. Go to https://supabase.com/dashboard/project/tcqatmkqmvaseakicqkr
2. Click **Settings** (gear icon on left)
3. Click **API**
4. Copy the **anon public** key (starts with `eyJ...`)

---

### **Step 2: Add Environment Variables to Render** (2 minutes)

**If you're using Render.com:**

1. Go to https://dashboard.render.com/
2. Select your **backend service** (Node.js)
3. Click **Environment** tab
4. Click **Add Environment Variable** for each:

```env
VITE_SUPABASE_FUNCTION_URL
https://tcqatmkqmvaseakicqkr.supabase.co/functions/v1/send-otp

VITE_SUPABASE_ANON_KEY
eyJ... (paste your anon key from Step 1)

VITE_SUPABASE_URL
https://tcqatmkqmvaseakicqkr.supabase.co
```

5. Click **Save Changes**
6. Render will automatically redeploy your backend

---

### **Step 3: Add Environment Variables to Vercel** (2 minutes)

**If you're using Vercel for frontend:**

1. Go to https://vercel.com/dashboard
2. Select your project
3. Click **Settings** → **Environment Variables**
4. Add these variables:

```env
VITE_SUPABASE_FUNCTION_URL
https://tcqatmkqmvaseakicqkr.supabase.co/functions/v1/send-otp

VITE_SUPABASE_ANON_KEY
eyJ... (paste your anon key)

VITE_SUPABASE_URL
https://tcqatmkqmvaseakicqkr.supabase.co
```

5. Click **Save**
6. Redeploy your frontend

---

### **Step 4: Local Development** (1 minute)

Create `.env` file in your backend folder:

```env
SUPABASE_URL=https://tcqatmkqmvaseakicqkr.supabase.co
VITE_SUPABASE_URL=https://tcqatmkqmvaseakicqkr.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ... (your anon key)
VITE_SUPABASE_FUNCTION_URL=https://tcqatmkqmvaseakicqkr.supabase.co/functions/v1/send-otp
PORT=5000
```

**Never commit `.env` to Git!**

---

## 🧪 **Step 5: Test It!** (2 minutes)

### **Test Password Reset:**
1. Go to your website
2. Click "Forgot Password"
3. Enter any email address
4. Check your email inbox (and spam folder)
5. Enter the 6-digit OTP
6. Success! 🎉

### **Check Database:**
1. Go to Supabase Dashboard → **Table Editor**
2. Select `password_reset_otps` table
3. You'll see the OTP record created
4. After you enter it correctly, it gets deleted automatically

---

## 📊 **Monitor Function Logs** (optional)

**See real-time function activity:**
```powershell
supabase functions logs send-otp --tail
```

**Or in Dashboard:**
- Supabase → **Edge Functions** → **send-otp** → **Logs**

---

## ✅ **Verification Checklist**

- [ ] Function deployed successfully ✅ (You already did this!)
- [ ] Got Supabase anon key
- [ ] Added `VITE_SUPABASE_FUNCTION_URL` to Render
- [ ] Added `VITE_SUPABASE_ANON_KEY` to Render  
- [ ] Added `VITE_SUPABASE_URL` to Render
- [ ] Created local `.env` file
- [ ] Tested password reset flow
- [ ] Received OTP email successfully
- [ ] Verified OTP deletion from database

---

## 🎯 **Summary**

### **Your Project ID:** `tcqatmkqmvaseakicqkr`

### **Your Function URL:**
```
https://tcqatmkqmvaseakicqkr.supabase.co/functions/v1/send-otp
```

### **3 Environment Variables Needed:**
1. `VITE_SUPABASE_URL` → `https://tcqatmkqmvaseakicqkr.supabase.co`
2. `VITE_SUPABASE_ANON_KEY` → Get from Supabase Dashboard → Settings → API
3. `VITE_SUPABASE_FUNCTION_URL` → `https://tcqatmkqmvaseakicqkr.supabase.co/functions/v1/send-otp`

### **Where to Add Them:**
- ✅ **Render** → Backend Service → Environment tab
- ✅ **Vercel** → Project → Settings → Environment Variables  
- ✅ **Local** → Create `backend/.env` file

---

## 🔥 **What's Different Now:**

**Before:**
- ❌ Resend free tier = 100 emails/day
- ❌ Gmail SMTP blocked on Render
- ❌ Emails failing in production

**After:**
- ✅ Unlimited FREE emails
- ✅ No SMTP (works on Render!)
- ✅ Professional email templates
- ✅ Database-backed OTPs
- ✅ Auto-expiry & cleanup
- ✅ Bilingual support (EN/BN)

**Total Setup Time:** 5-7 minutes  
**Cost:** $0.00 forever

🎉 **You're production ready!**
