# 🚀 Resend Email Setup Guide

## Why Resend?
Render blocks SMTP ports (25, 465, 587) which prevents Gmail from working. Resend uses HTTP API instead, so it works perfectly on Render.

## Step-by-Step Setup

### 1. Create Resend Account (FREE - 100 emails/day)
1. Go to: https://resend.com/signup
2. Sign up with your email
3. Verify your email

### 2. Get Your API Key
1. After login, go to: https://resend.com/api-keys
2. Click **"Create API Key"**
3. Name it: `BRTA Backend`
4. Select: **"Sending access"**
5. Click **Create**
6. **COPY THE API KEY** (starts with `re_...`)
   - ⚠️ You can only see it once!

### 3. Add API Key to Render
1. Go to your Render dashboard: https://dashboard.render.com/
2. Click on your **backend service** (brta-extended)
3. Go to **"Environment"** tab on the left
4. Click **"Add Environment Variable"**
5. Add:
   - **Key**: `RESEND_API_KEY`
   - **Value**: Paste the API key you copied (starts with `re_...`)
6. Click **"Save Changes"**
7. Your backend will **automatically redeploy** (wait 2-3 minutes)

### 4. Test Your Setup
1. Go to your website: https://brta-extended.vercel.app/signup
2. Try creating a new account
3. You should receive the OTP email within seconds! ✅
4. Check your **spam folder** if you don't see it in inbox

## Verify Email Domain (Optional - For Production)

Right now, emails will come from `onboarding@resend.dev`. To use your own domain:

1. In Resend dashboard, go to **"Domains"**
2. Click **"Add Domain"**
3. Enter your domain (e.g., `brta.gov.bd`)
4. Add the DNS records they provide
5. Once verified, update in backend `.env`:
   ```
   FROM_EMAIL=BRTA 2.0 <noreply@yourdomain.com>
   ```

## Important Notes

✅ **FREE Plan**: 100 emails/day, 3,000/month
✅ **No credit card required**
✅ **Works perfectly on Render**
✅ **Same OTP system** - nothing changes in your frontend
✅ **Automatic fallback** - uses Gmail SMTP locally if Resend isn't configured

## Troubleshooting

**Q: Email not received?**
- Check spam/junk folder
- Check Resend dashboard logs: https://resend.com/emails
- Make sure API key is added in Render environment variables

**Q: Still getting timeout errors?**
- Wait for Render to finish redeploying after adding the API key
- Check Render logs to confirm the new environment variable is loaded

**Q: Want to test locally?**
- Add `RESEND_API_KEY=re_your_key_here` to `backend/.env`
- Restart your backend server

## Current Status

✅ Code updated to use Resend API
✅ Fallback to Gmail SMTP for local development  
⏳ **Next: Add RESEND_API_KEY to Render environment variables**

Once you add the API key to Render, your signup OTP system will work perfectly! 🎉
