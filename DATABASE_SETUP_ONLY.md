# 🎯 QUICK DATABASE SETUP - Copy & Paste This

## Step 1: Go to Supabase
1. Open: https://supabase.com/dashboard
2. Select your BRTA project
3. Click **"SQL Editor"** (left sidebar)
4. Click **"New Query"**

## Step 2: Copy This SQL Code

**File Location**: `d:\My_Project\brta_extended\database\route_permits_system.sql`

**OR** just copy-paste from the file and click RUN in Supabase SQL Editor!

---

## After Running SQL:

Your system is **100% READY**! ✅

Just restart both servers:

### Terminal 1 - Backend:
```powershell
cd d:\My_Project\brta_extended\backend
node server.js
```

### Terminal 2 - Frontend:
```powershell
cd d:\My_Project\brta_extended
npm run dev
```

---

## ✨ What's Already Done:

✅ NPM packages installed (leaflet, react-leaflet, qrcode)  
✅ Backend payment endpoint added  
✅ Payment notifications configured  
✅ User dashboard menu updated  
✅ Admin panel tab added  
✅ Public verification route added  
✅ Leaflet CSS loaded  
✅ All components created  

## ⏳ Only This Left:

❗ Run the database SQL script (takes 5 seconds)

---

## 🧪 Quick Test After Setup:

1. Login as **user**
2. Click **"Route Permits"** (🗺️ icon)
3. Click **"Apply for Route Permit"**
4. **Select vehicle** from your registered vehicles
5. **Click on map** to select start/end points
6. **Upload document** (PDF or image)
7. **Enter reason** for permit
8. Click **"Proceed to Payment"**
9. Complete payment
10. Login as **admin**
11. Go to **"Route Permits"** tab
12. **Review and approve** the application
13. Back as **user** - **Download PDF** with QR code
14. **Scan QR code** or visit verification link

---

## 🆘 If You Get Stuck:

All documentation is in:
- `ROUTE_PERMIT_SETUP.md` - Full documentation
- `ROUTE_PERMIT_CODE_SNIPPETS.md` - Backend code
- `ROUTE_PERMIT_FRONTEND_SNIPPETS.md` - Frontend code
- `SETUP_COMPLETE.md` - What I did for you

---

**You're almost there! Just run that SQL script! 🚀**
