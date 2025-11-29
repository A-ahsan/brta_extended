# 🚀 Quick Start Guide - License Generation System

## Prerequisites
- Node.js installed
- Supabase account with project created
- Frontend and backend terminals

---

## ⚡ Quick Setup (5 Minutes)

### 1. Database Setup
Go to **Supabase Dashboard → SQL Editor** and run these files **in order**:

```sql
-- 1. Create licenses table
Run: database/licenses_schema.sql

-- 2. Enable realtime
Run: database/enable_realtime_licenses.sql
```

Then enable realtime in UI:
- Go to **Database → Replication**
- Find `licenses` table
- Toggle **ON**

---

### 2. Backend Setup

```powershell
# Navigate to backend
cd backend

# Install dependencies (first time only)
npm install

# Start backend server
npm start
```

✅ Backend running on **http://localhost:5000**

---

### 3. Frontend Setup

```powershell
# Navigate to project root (if not there already)
cd d:\My_Project\brta_extended

# Install dependencies (if not done)
npm install

# Start frontend
npm run dev -- --host
```

✅ Frontend running on **http://localhost:3000**
✅ Network access on **http://192.168.x.x:3000**

---

## 🎯 Testing License Generation

### Step 1: Create & Approve Application (Admin Side)

1. **Create a test application:**
   - Open app
   - Login as user
   - Go to "License Application" tab
   - Fill out the form with test data
   - Submit

2. **Complete all steps:**
   - NID Verification (admin approves)
   - Face Verification (upload photo)
   - Online Exam (complete exam)
   - Physical Exam (admin schedules & completes)
   - Payment (make payment via SSLCommerz)

3. **Admin approves:**
   - Login as admin
   - Find application
   - Mark as "Approved"

---

### Step 2: Generate License (User Side)

1. **Login as user**
2. **Go to Profile tab**
3. **Click "Generate License" button**
4. **Wait for success notification**
5. **License card appears!**

---

### Step 3: Test QR Code

**Option A: Test on Same Device**
1. Right-click QR code on license back
2. Copy image
3. Use QR scanner app or website to scan
4. Should open: `http://localhost:3000/license/DL...`

**Option B: Test on Mobile (Same Network)**
1. Make sure frontend runs with `--host` flag
2. Check terminal for network URL (e.g., `192.168.1.100:3000`)
3. Scan QR code with phone
4. Should open: `http://192.168.1.100:3000/license/DL...`

---

## 📱 Features to Test

### ✅ License Card
- [ ] Front side shows all details
- [ ] Photo displays (if available)
- [ ] Flip animation works
- [ ] Back side shows QR code
- [ ] Download PDF works
- [ ] PDF has both front & back

### ✅ QR Code
- [ ] QR code generated correctly
- [ ] Scanning opens public page
- [ ] Public page shows license details
- [ ] Works on localhost
- [ ] Works on network IP

### ✅ Notifications
- [ ] User gets notification when license generated
- [ ] Admin gets notification when license generated
- [ ] Notifications appear in real-time
- [ ] Different messages for user/admin

### ✅ Security
- [ ] Only approved+paid applications can generate
- [ ] Can't generate duplicate licenses
- [ ] Public can view license via QR only
- [ ] Users can only see their own licenses in profile

---

## 🐛 Troubleshooting

### Backend not starting?
```powershell
# Make sure you're in backend folder
cd backend

# Check if dependencies installed
npm install

# Try running again
npm start
```

### Frontend not loading licenses?
1. Check backend is running on port 5000
2. Open browser console (F12)
3. Look for errors
4. Verify Supabase connection

### QR code not working?
1. Check frontend URL in browser
2. Verify `window.location.origin` matches
3. Test on same network for mobile
4. Make sure public route is added in App.jsx

### Generate button not showing?
1. Ensure application is **approved**
2. Ensure **payment = 1** in database
3. Check no existing license for that application
4. Look at browser console for errors

---

## 📝 Important Notes

1. **Backend must run on port 5000** (or update API calls)
2. **Frontend needs `--host` flag** for network access
3. **Database setup must be done first**
4. **Realtime must be enabled** in Supabase UI
5. **Service role key** must be in backend/.env

---

## 🎯 Ready for Championship!

Once you see:
- ✅ Backend running
- ✅ Frontend running  
- ✅ Database tables created
- ✅ Generate button appears
- ✅ License generated successfully
- ✅ QR code works

**You're ready to go! Good luck! 🏆**

---

## 📞 Quick Commands

```powershell
# Start everything
cd backend; npm start

# In new terminal
cd ..; npm run dev -- --host

# Access app
# Local: http://localhost:3000
# Network: http://YOUR_IP:3000
```
