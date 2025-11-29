# 🚗 Vehicle Adder System - Complete Setup Guide

## ✨ Overview

The **Vehicle Adder** is a new user type in the BRTA system that allows authorized personnel to:
- Add new vehicles to the system
- View all license holders
- Match vehicle types with appropriate licenses (Bike/Car)
- Manage vehicle ownership records

---

## 🎯 Key Features

### ✅ Smart License Matching
- **Light License** → Can add **Bikes only**
- **Motor License** → Can add **Cars only**
- **Light+Motor License** → Can add **Both Bikes and Cars**

### ✅ Modern UI
- Purple/Teal gradient theme (championship level design)
- Bilingual support (English + Bangla)
- Dark mode compatible
- Logo and smooth animations
- Same color contrast as existing dashboards

### ✅ Complete Functionality
- Real-time license holder search
- Vehicle type validation based on license
- Comprehensive vehicle listing
- Normalized database schema

---

## 📋 Setup Instructions

### Step 1: Run Database Schema

Run the following SQL files in your Supabase SQL Editor:

1. **Update Profiles Table** (if not already done):
```sql
-- File: sql/01_create_profiles_table.sql
-- This adds 'vehicle_adder' to the allowed roles
```

2. **Create Vehicles Table**:
```sql
-- File: database/vehicles_schema.sql
-- Run this in Supabase SQL Editor
```

### Step 2: Create Vehicle Adder Account

**Method 1: Easy Way (Recommended)**
1. Sign up normally through `/signup`
2. Go to Supabase → **Table Editor** → **profiles**
3. Find your user
4. Change `role` from `user` to `vehicle_adder`

**Method 2: SQL Way**
```sql
-- Create a vehicle adder account
-- Replace with your email and password
INSERT INTO auth.users (email, encrypted_password, email_confirmed_at)
VALUES ('vehicleadder@brta.gov.bd', crypt('your-password', gen_salt('bf')), NOW());

-- Get the user ID and create profile
INSERT INTO profiles (id, email, full_name, role)
SELECT id, 'vehicleadder@brta.gov.bd', 'Vehicle Adder', 'vehicle_adder'
FROM auth.users WHERE email = 'vehicleadder@brta.gov.bd';
```

### Step 3: Test the System

1. **Login**: Navigate to `/vehicle-adder-login`
2. **Dashboard**: After login, you'll be at `/vehicle-adder`
3. **Add Vehicle**: 
   - Select a license holder
   - Choose vehicle type (Bike/Car)
   - Fill in vehicle details
   - Submit

---

## 🔐 Access URLs

| User Type | Login URL | Dashboard URL |
|-----------|-----------|---------------|
| **Vehicle Adder** | `/vehicle-adder-login` | `/vehicle-adder` |
| **Regular User** | `/login` | `/dashboard` |
| **Admin** | `/admin-login` | `/admin` |
| **Police** | `/police-login` | `/police-dashboard` |

---

## 📊 Database Schema

### Vehicles Table
```sql
vehicles
├── id (UUID, Primary Key)
├── vehicle_name (TEXT)
├── model (TEXT)
├── engine_number (TEXT, Unique)
├── owner_id (UUID, FK to auth.users)
├── license_id (UUID, FK to licenses)
├── vehicle_type (VARCHAR: 'Bike', 'Car')
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)
```

### Relationships
- `owner_id` → Links to `auth.users.id`
- `license_id` → Links to `licenses.id`

---

## 🛠️ Backend API Endpoints

### 1. Add Vehicle
```javascript
POST /api/vehicles/add

Body:
{
  "vehicle_name": "Honda",
  "model": "Civic 2022",
  "engine_number": "HC2022ABC123",
  "owner_id": "uuid",
  "license_id": "uuid",
  "vehicle_type": "Car"
}

Response:
{
  "success": true,
  "vehicle": { ... },
  "message": "Vehicle added successfully"
}
```

### 2. Get License Holders
```javascript
GET /api/licenses/holders

Response:
{
  "success": true,
  "holders": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "license_number": "DL25XXXXXXX",
      "license_type": "Light",
      "license_category": "Non-Professional",
      "full_name_en": "John Doe",
      "full_name_bn": "জন ডো"
    }
  ]
}
```

---

## 🎨 UI Components

### Login Page (`VehicleAdderLogin.jsx`)
- Purple/Teal gradient background
- Animated background blobs
- Motorcycle + Car icons
- Bilingual form
- Dark mode support
- Links to other login pages

### Dashboard (`VehicleAdderDashboard.jsx`)
- **Sidebar Navigation**:
  - Add Vehicle
  - Vehicle List
  - License Holders
  
- **Add Vehicle Tab**:
  - License holder search
  - Smart vehicle type selection (disabled if license doesn't match)
  - Form validation
  - Real-time feedback
  
- **Vehicle List Tab**:
  - Table view of all vehicles
  - Owner information
  - Engine number display
  - Vehicle type badges
  
- **License Holders Tab**:
  - Search functionality
  - Card-based layout
  - License type and category display

---

## 🚀 Features Implemented

### ✅ Smart Validation
- Vehicle type matches license type
- Unique engine numbers
- Owner verification
- Real-time error messages

### ✅ Bilingual Support
All text translates between:
- English (en)
- Bangla (bn)

### ✅ Dark Mode
- Fully compatible with system dark mode
- Smooth transitions
- Proper contrast ratios

### ✅ Animations
- Framer Motion animations
- Smooth page transitions
- Loading states
- Hover effects

### ✅ Responsive Design
- Mobile-friendly
- Tablet optimized
- Desktop enhanced

---

## 🔄 License Type Logic

| License Type | Can Add Bikes | Can Add Cars |
|--------------|---------------|--------------|
| **Light** | ✅ Yes | ❌ No |
| **Motor** | ❌ No | ✅ Yes |
| **Light+Motor** | ✅ Yes | ✅ Yes |

This logic is enforced both on:
- **Frontend**: UI disables invalid options
- **Backend**: API validates before insertion

---

## 📝 Example Usage Flow

1. **Vehicle Adder logs in** at `/vehicle-adder-login`
2. **Navigates to "Add Vehicle"** tab
3. **Searches for license holder** by name/license number
4. **Selects a holder** with "Light" license
5. **Sees "Bike" enabled, "Car" disabled**
6. **Selects Bike**, fills form:
   - Vehicle Name: Yamaha
   - Model: R15 V4
   - Engine Number: YMH2024XYZ789
7. **Submits** → Success toast
8. **Vehicle appears** in "Vehicle List" tab

---

## 🎯 Testing Checklist

- [ ] Can login as vehicle_adder
- [ ] Dashboard loads correctly
- [ ] License holders list appears
- [ ] Search works for license holders
- [ ] Vehicle type validation works (Light = Bike only, Motor = Car only)
- [ ] Form validation prevents empty submissions
- [ ] Vehicle successfully added to database
- [ ] Vehicle list displays all added vehicles
- [ ] Dark mode works properly
- [ ] Bilingual switching works
- [ ] Logout redirects to login page

---

## 🚨 Common Issues & Solutions

### "Access denied" error
**Solution**: Make sure the user's role in `profiles` table is set to `vehicle_adder`

### "Failed to load license holders"
**Solution**: 
1. Check backend is running on port 5000
2. Verify `licenses` table has data
3. Check browser console for CORS errors

### Vehicle type buttons disabled
**Solution**: This is normal if the selected license doesn't allow that vehicle type

### "License not valid for bikes/cars" error
**Solution**: The selected holder's license doesn't permit that vehicle type. Choose the correct vehicle type or a different holder.

---

## 📂 Files Created/Modified

### New Files:
```
src/pages/
  ├── VehicleAdderLogin.jsx
  └── VehicleAdderDashboard.jsx

database/
  └── vehicles_schema.sql

ROOT/
  └── VEHICLE_ADDER_SETUP.md
```

### Modified Files:
```
src/
  └── App.jsx (Added vehicle adder routes)

sql/
  └── 01_create_profiles_table.sql (Added vehicle_adder role)

backend/
  └── server.js (Added vehicle adder API endpoints)
```

---

## 🎉 Success!

Your Vehicle Adder system is now complete with:
- ✅ Championship-level UI
- ✅ Bilingual support
- ✅ Dark mode
- ✅ Smart license validation
- ✅ Normalized database
- ✅ Real-time updates
- ✅ Secure authentication

**Test Credentials (after setup)**:
- Email: `vehicleadder@brta.gov.bd`
- Password: (set during account creation)

---

## 📞 Support

If you encounter any issues:
1. Check browser console for errors
2. Verify database schema is created
3. Ensure backend server is running
4. Check user role in profiles table

---

**Last Updated**: November 29, 2025
**Version**: 1.0.0
