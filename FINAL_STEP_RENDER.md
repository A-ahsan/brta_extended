# 🎯 Final Step - Add One Environment Variable to Render

## ✅ **Code Pushed Successfully!**

Render is now redeploying with the new Supabase OTP code.

---

## 📝 **What You Need to Do RIGHT NOW:**

### **1. Get Your Supabase Anon Key** (30 seconds)

1. Go to: https://supabase.com/dashboard/project/tcqatmkqmvaseakicqkr
2. Click **Settings** (left sidebar)
3. Click **API**
4. Copy the **`anon` `public`** key (it starts with `eyJ...`)

---

### **2. Add to Render** (1 minute)

1. Go to: https://dashboard.render.com/
2. Click your **backend service** (brta-extended)
3. Click **Environment** tab
4. Click **Add Environment Variable**

**Add these 3 variables:**

```
Name: VITE_SUPABASE_URL
Value: https://tcqatmkqmvaseakicqkr.supabase.co
```

```
Name: VITE_SUPABASE_ANON_KEY
Value: eyJ... (paste your anon key from step 1)
```

```
Name: VITE_SUPABASE_FUNCTION_URL
Value: https://tcqatmkqmvaseakicqkr.supabase.co/functions/v1/send-otp
```

5. Click **Save Changes**
6. Render will **automatically redeploy** (takes ~2 minutes)

---

## 🎉 **What Happens After:**

### **Before (Old Code):**
```
2025-12-19T12:50:10.563398877Z Sending OTP via Resend API...
2025-12-19T12:50:10.563420538Z Resend API error: {
2025-12-19T12:50:10.563430738Z   statusCode: 403,
```

### **After (New Code):**
```
2025-12-19T12:55:10.563398877Z Sending OTP to user@email.com via Supabase Edge Function...
2025-12-19T12:55:11.123456789Z OTP sent successfully via Supabase
```

---

## ✅ **Verification:**

1. Wait for Render deployment to finish (~2 minutes)
2. Go to your website
3. Try "Forgot Password"
4. Enter any email
5. Check email inbox (and spam)
6. You should receive OTP email! 🎉

---

## 🔍 **Check Logs:**

**In Render Dashboard:**
- Go to **Logs** tab
- You should see: `Sending OTP to ... via Supabase Edge Function...`
- Then: `OTP sent successfully via Supabase`

**No more:**
- ❌ "Resend API error: 403"
- ❌ "Gmail SMTP connection timeout"

---

## 🚨 **If You Still See Old Logs:**

**Wait 2-3 minutes** - Render takes time to:
1. Pull latest code from GitHub ✅ (Done)
2. Install dependencies
3. Restart server
4. Load new environment variables ⏳ (Need to add them!)

**Then test password reset again.**

---

## 📊 **Final Checklist:**

- [x] Code pushed to GitHub
- [x] Render auto-deploying
- [ ] Add `VITE_SUPABASE_URL` to Render
- [ ] Add `VITE_SUPABASE_ANON_KEY` to Render
- [ ] Add `VITE_SUPABASE_FUNCTION_URL` to Render
- [ ] Wait for deployment to finish
- [ ] Test password reset
- [ ] Receive OTP email successfully

---

## 🎯 **Summary:**

Your project ID: **tcqatmkqmvaseakicqkr**

**3 Environment Variables to Add:**
1. `VITE_SUPABASE_URL` → `https://tcqatmkqmvaseakicqkr.supabase.co`
2. `VITE_SUPABASE_ANON_KEY` → Get from Supabase Dashboard → Settings → API
3. `VITE_SUPABASE_FUNCTION_URL` → `https://tcqatmkqmvaseakicqkr.supabase.co/functions/v1/send-otp`

**Where:** Render Dashboard → Your Service → Environment tab

**Time:** 2 minutes + 2 minutes deployment = 4 minutes total

🚀 **You're almost there!**
