# 🔐 Password Reset (OTP-Based) & Email Authentication Setup Guide

## ✅ Completed Features

### 1. OTP-Based Password Reset
- ✅ 6-digit OTP generation
- ✅ OTP sent via email (10-minute validity)
- ✅ Beautiful OTP input with 6 separate boxes
- ✅ Auto-focus and paste support
- ✅ Maximum 5 verification attempts
- ✅ OTP resend functionality
- ✅ Two-step verification (OTP first, then password)

### 2. Password Strength Requirements
- ✅ Minimum 8 characters
- ✅ At least one uppercase letter (A-Z)
- ✅ At least one lowercase letter (a-z)
- ✅ At least one number (0-9)
- ✅ At least one special character (!@#$%^&*()...)
- ✅ Real-time strength indicator (Weak/Medium/Strong)
- ✅ Visual feedback with color-coded strength bar
- ✅ Requirements checklist with checkmarks

### 2. Email Validation
- ✅ Prevents fake emails like `a@a.com`
- ✅ Blocks disposable/temporary email domains
- ✅ Validates proper email format
- ✅ Suggests corrections for common typos (e.g., gmial.com → gmail.com)
- ✅ Real-time validation feedback

### 3. Password Reset Flow (OTP-Based)
- ✅ Forgot Password page with email submission
- ✅ 6-digit OTP generation (10-minute expiry)
- ✅ Email sent with OTP code
- ✅ Reset Password page with OTP input (6 boxes)
- ✅ OTP verification before password reset
- ✅ Password strength requirements enforced on reset
- ✅ Automatic redirect to login after successful reset

### 4. Backend API Endpoints
- ✅ `POST /api/auth/request-otp` - Request OTP for password reset
- ✅ `POST /api/auth/verify-otp` - Verify OTP code
- ✅ `POST /api/auth/reset-password` - Reset password with OTP

### 5. UI Pages Created
- ✅ `/forgot-password` - Request password reset
- ✅ `/reset-password?token=xxx` - Reset password with token
- ✅ Updated Login page with "Forgot Password" link
- ✅ Updated Signup page with password strength meter and email validation

---

## 🔧 Gmail SMTP Configuration

### Step 1: Enable 2-Step Verification on Gmail

1. Go to your Google Account: https://myaccount.google.com/
2. Navigate to **Security** → **2-Step Verification**
3. Turn on **2-Step Verification**

### Step 2: Create App Password

1. Go to **Security** → **App passwords** (https://myaccount.google.com/apppasswords)
   - If you don't see "App passwords", make sure 2-Step Verification is turned on
2. Select **Mail** as the app
3. Select **Other (Custom name)** as the device
4. Enter a name like "BRTA 2.0 Backend"
5. Click **Generate**
6. **Copy the 16-character password** (it looks like: `xxxx xxxx xxxx xxxx`)
   - Save this password securely!

### Step 3: Update Backend Environment Variables

1. Open `backend/.env` file (create if it doesn't exist)
2. Add these variables:

```env
# Gmail SMTP Configuration
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-16-character-app-password

# Frontend URL (for reset links)
FRONTEND_URL=http://localhost:5173

# Supabase Configuration (existing)
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Example:**
```env
GMAIL_USER=brta.portal@gmail.com
GMAIL_APP_PASSWORD=abcd efgh ijkl mnop
FRONTEND_URL=http://localhost:5173
```

### Step 4: Test Email Sending

1. Start the backend server:
```bash
cd backend
npm start
```

2. Test forgot password:
   - Go to http://localhost:5173/forgot-password
   - Enter a valid email address
   - Check your inbox for the reset email

---

## 📝 Environment Variables Reference

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `GMAIL_USER` | Gmail address for sending emails | `brta.portal@gmail.com` |
| `GMAIL_APP_PASSWORD` | 16-character app password from Google | `abcd efgh ijkl mnop` |
| `FRONTEND_URL` | Frontend URL for reset links | `http://localhost:5173` |
| `SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |

---

## 🧪 Testing Guide

### Test Password Strength Validation

1. **Go to Signup Page** (`/signup`)
2. **Try weak passwords:**
   - `password` - Missing uppercase, number, special character
   - `Password` - Missing number, special character
   - `Pass1!` - Too short (less than 8 characters)
3. **Try strong password:**
   - `MyP@ssw0rd123` - ✅ All requirements met

### Test Email Validation

1. **Go to Signup Page** (`/signup`)
2. **Try fake emails:**
   - `a@a.com` - ❌ Blocked (too simple)
   - `test@test.com` - ❌ Blocked (simple domain)
   - `user@10minutemail.com` - ❌ Blocked (disposable email)
3. **Try valid email:**
   - `john.doe@gmail.com` - ✅ Accepted
   - `user@yahoo.com` - ✅ Accepted

### Test Forgot Password Flow (OTP-Based)

1. **Request OTP:**
   - Go to `/forgot-password`
   - Enter your email
   - Click "Send OTP Code"
   - Check your email inbox for 6-digit OTP

2. **Verify OTP and Reset Password:**
   - You'll be redirected to `/reset-password?email=your@email.com`
   - Enter the 6-digit OTP from your email
   - Click "Verify OTP"
   - After verification, enter a strong new password
   - Confirm password
   - Click "Reset Password"
   - Should redirect to login

3. **Login with New Password:**
   - Go to `/login`
   - Enter email and new password
   - Should successfully login

4. **Test OTP Features:**
   - Try pasting OTP (should work)
   - Try wrong OTP (should show attempts left)
   - Try resending OTP (should get new code)

---

## 🚀 Production Deployment

### For Production (Vercel/Netlify/etc.)

1. **Update Frontend URL:**
```env
FRONTEND_URL=https://your-domain.com
```

2. **Add Environment Variables** to your hosting platform:
   - Vercel: Settings → Environment Variables
   - Netlify: Site Settings → Environment Variables

3. **Use Custom Domain for Email:**
   - Consider using a custom domain email (e.g., `noreply@brta.gov.bd`)
   - Or use a professional Gmail account (e.g., `support@brta.gov.bd`)

4. **Security Considerations:**
   - Never commit `.env` file to Git
   - Use strong app passwords
   - Monitor email sending limits (Gmail: 500 emails/day for free accounts)
   - Consider using SendGrid or AWS SES for production

---

## 📧 Email Templates

The system sends beautifully designed HTML emails with:

- **OTP Email:**
  - Branded header with BRTA logo colors
  - Large, easy-to-read 6-digit OTP code
  - Dashed border box highlighting the OTP
  - 10-minute expiry warning
  - Security warnings (never share OTP, max 5 attempts)
  - Bilingual support (English/Bengali)

- **Welcome Email (Optional):**
  - Greeting with user's name
  - List of available features
  - Professional styling

---

## 🔒 Security Features

1. **Password Requirements:**
   - Enforced on signup
   - Enforced on password reset
   - Cannot bypass requirements

2. **OTP Security:**
   - Cryptographically secure 6-digit random OTP
   - 10-minute expiry
   - Maximum 5 verification attempts
   - Single-use OTPs (deleted after use)
   - Automatic cleanup of expired OTPs
   - Email-specific (cannot reuse for different email)

3. **Email Validation:**
   - Prevents enumeration attacks (returns success even if user doesn't exist)
   - Blocks disposable emails
   - Validates format

4. **Rate Limiting (Recommended):**
   - Add rate limiting to prevent abuse
   - Limit password reset requests per IP/email

---

## 🐛 Troubleshooting

### Email Not Sending

**Check:**
1. ✅ Gmail credentials are correct
2. ✅ 2-Step Verification is enabled
3. ✅ App password is correct (no spaces)
4. ✅ Backend server is running
5. ✅ Check backend console for errors

**Common Issues:**
- **Invalid login credentials:** App password is wrong
- **Less secure app access:** Enable 2-Step Verification and use App Password
- **Daily sending limit exceeded:** Gmail free account limit is 500/day

### OTP Not Working

**Check:**
1. ✅ OTP hasn't expired (10 minute limit)
2. ✅ Entered all 6 digits correctly
3. ✅ Haven't exceeded 5 verification attempts
4. ✅ Using the correct email address

### Password Validation Not Working

**Check:**
1. ✅ All requirements are met (uppercase, lowercase, number, special character, 8+ chars)
2. ✅ No spaces in password
3. ✅ Check password strength meter for specific requirements

---

## 📚 API Documentation

### POST /api/auth/request-otp

**Request:**
```json
{
  "email": "user@example.com",
  "language": "en"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent to your email. Valid for 10 minutes"
}
```

### POST /api/auth/verify-otp

**Request:**
```json
{
  "email": "user@example.com",
  "otp": "123456",
  "language": "en"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "OTP verified successfully"
}
```

**Response (Failed):**
```json
{
  "success": false,
  "error": "Invalid OTP",
  "attemptsLeft": 3
}
```

### POST /api/auth/reset-password

**Request:**
```json
{
  "email": "user@example.com",
  "otp": "123456",
  "newPassword": "MyNewP@ssw0rd123",
  "language": "en"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

---

## 📞 Support

If you encounter any issues:

1. Check backend console logs
2. Verify all environment variables are set
3. Test email sending with a simple test script
4. Check Gmail account security settings

---

## ✅ Complete Setup Checklist

- [ ] Gmail 2-Step Verification enabled
- [ ] App Password generated
- [ ] `backend/.env` updated with Gmail credentials
- [ ] `FRONTEND_URL` set correctly
- [ ] Backend server running
- [ ] Tested OTP request flow
- [ ] Tested OTP email reception
- [ ] Tested OTP verification (correct and wrong OTP)
- [ ] Tested OTP resend
- [ ] Tested password reset with OTP
- [ ] Tested login with new password
- [ ] Tested signup with password strength validation
- [ ] Tested email validation for fake emails

---

**🎉 All features are now complete and ready to use!**

For production deployment, remember to:
1. Use environment variables on your hosting platform
2. Update `FRONTEND_URL` to your production domain
3. Consider using a professional email service (SendGrid, AWS SES) for higher limits
4. Implement rate limiting for security
