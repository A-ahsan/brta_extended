# Resend Email Setup for OTP System

## Why Resend?
Render blocks SMTP ports (25, 465, 587), so Gmail SMTP fails with connection timeout. Resend uses HTTP API instead of SMTP, which works perfectly on Render.

## Setup Steps

### 1. Create Free Resend Account
1. Go to https://resend.com/signup
2. Sign up with your email (FREE - 100 emails/day, 3,000/month)
3. Verify your email

### 2. Get API Key
1. After login, go to **API Keys** section
2. Click **Create API Key**
3. Name it: `BRTA Production`
4. Copy the API key (starts with `re_...`)

### 3. Update Render Environment Variables
1. Go to your Render dashboard: https://dashboard.render.com
2. Select your backend service (`brta-extended` or similar)
3. Go to **Environment** tab
4. Click **Add Environment Variable**
5. Add these:
   ```
   RESEND_API_KEY=re_your_actual_api_key_here
   FRONTEND_URL=https://brta-extended.vercel.app
   ```
6. Click **Save Changes**
7. Render will automatically redeploy

### 4. Deploy Backend Changes
1. In your terminal, run:
   ```powershell
   cd D:\My_Project\brta_extended\backend
   git add .
   git commit -m "Fix OTP email service for Render deployment"
   git push
   ```

2. Render will auto-deploy (takes 2-3 minutes)

### 5. Test Signup
1. Go to your website: https://brta-extended.vercel.app/signup
2. Fill in the signup form
3. You should receive OTP email within 5-10 seconds
4. Check spam folder if not in inbox

## What Changed?

✅ **Email Service**: Now uses Resend API (HTTP) instead of Gmail SMTP
✅ **Frontend URL**: Fixed to use Vercel production URL
✅ **Fallback**: Still uses Gmail SMTP for local development
✅ **Same OTP System**: No changes to OTP logic, just the delivery method

## Troubleshooting

### If OTP still doesn't arrive:
1. Check Render logs for errors
2. Verify RESEND_API_KEY is set correctly in Render
3. Check email spam/junk folder
4. Try with different email address

### Check Render Logs:
```
Go to Render Dashboard → Your Service → Logs tab
Look for: "Sending OTP via Resend API..."
```

### If you see errors:
- "Invalid API key" → Check RESEND_API_KEY in Render
- "Email not sent" → Verify domain or use default onboarding@resend.dev

## Production Domain (Optional)

For better email deliverability, you can add your own domain:
1. In Resend dashboard, go to **Domains**
2. Add your domain (e.g., brta-bd.com)
3. Add DNS records as shown
4. Update FROM_EMAIL in emailService.js to `BRTA 2.0 <noreply@yourdomain.com>`

## Free Tier Limits
- 100 emails per day
- 3,000 emails per month
- Perfect for testing and small projects

That's it! Your OTP system will now work perfectly on Render! 🎉
