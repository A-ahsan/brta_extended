# License Generation System - Complete Setup Guide

## 🎯 Overview
This system allows users to generate digital driving licenses after their application is approved. The license includes:
- Dynamic QR code that works on both localhost and network
- Public verification page accessible via QR scan
- Real-time notifications for users and admins
- Downloadable PDF with front and back views
- Normalized database schema

---

## 📦 Database Setup

### Step 1: Create Licenses Table
Run the following SQL file in your Supabase SQL Editor:

```bash
database/licenses_schema.sql
```

This creates:
- `licenses` table with all necessary fields
- License number generation function
- Expiry date calculation (5 years from issue)
- RLS policies for security
- Indexes for performance

### Step 2: Enable Realtime
Run this SQL file:

```bash
database/enable_realtime_licenses.sql
```

Then go to **Supabase Dashboard → Database → Replication** and enable realtime for the `licenses` table.

---

## 🔧 Backend Setup

### Step 1: Install Dependencies
The backend already has the necessary dependencies. Make sure `@supabase/supabase-js` is installed:

```bash
cd backend
npm install @supabase/supabase-js
```

### Step 2: Environment Variables
Ensure your `backend/.env` file has:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
PORT=5000
```

### Step 3: Start Backend Server
```bash
cd backend
node server.js
```

The backend now has these endpoints:
- `POST /api/licenses/generate` - Generate a new license
- `GET /api/licenses/:license_number` - Public license view

---

## 🎨 Frontend Features

### 1. **License Generation Button**
- Appears in Profile tab when:
  - Application is approved
  - Payment is completed
  - No license exists for that application
- Click to generate license instantly
- Shows loading state during generation

### 2. **License Display**
- Beautiful card with flip animation
- **Front**: Photo, name, license number, type, validity
- **Back**: QR code, NID, address, additional details
- Dynamic QR code that adapts to localhost/network URL

### 3. **QR Code Functionality**
- Generated using `generateLicenseQRCode(license_number)`
- URL format: `http://localhost:3000/license/DL2512345678` (localhost)
- URL format: `http://192.168.1.100:3000/license/DL2512345678` (network)
- Anyone scanning the QR code sees the public license verification page

### 4. **Public License View**
- Route: `/license/:license_number`
- Accessible to anyone (public)
- Shows license details with verification status
- Beautiful UI with flip animation
- Verification badges (Valid/Expired/Suspended)

### 5. **Download as PDF**
- Click "Download" button on license card
- Generates PDF with both front and back
- Ready to print

---

## 🔔 Notification System

### User Notification
When license is generated, user receives:
```
Title: License Generated Successfully
Message: Your driving license DL2512345678 has been generated successfully. 
         You can now view and download it from your profile.
```

### Admin Notification
All admins receive:
```
Title: New License Generated
Message: A new driving license DL2512345678 has been generated for John Doe.
```

Notifications appear in real-time using Supabase realtime subscriptions.

---

## 🚀 How It Works

### Step-by-Step Flow:

1. **User completes application process:**
   - NID verification
   - Face verification  
   - Online exam
   - Physical exam
   - Payment

2. **Admin approves application**

3. **"Generate License" button appears in user profile**

4. **User clicks "Generate License"**
   - Frontend calls: `POST /api/licenses/generate`
   - Backend:
     - Validates application status
     - Generates unique license number
     - Creates license record
     - Sends notifications to user and admins
   - Frontend:
     - Shows success message
     - Refreshes license list
     - Displays new license card

5. **User can now:**
   - View license in profile
   - Download as PDF
   - Share QR code for verification

6. **Anyone scanning QR code:**
   - Gets redirected to `/license/:license_number`
   - Sees public verification page
   - Can verify authenticity

---

## 📱 QR Code URL Logic

```javascript
const generateLicenseQRCode = (licenseNumber) => {
  // Automatically uses localhost or network IP
  const baseUrl = window.location.origin;
  const licenseUrl = `${baseUrl}/license/${licenseNumber}`;
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(licenseUrl)}`;
};
```

**Examples:**
- Localhost: `http://localhost:3000/license/DL2512345678`
- Network: `http://192.168.1.100:3000/license/DL2512345678`
- Production: `https://yourdomain.com/license/DL2512345678`

---

## 🎨 UI Components

### Created Files:
1. **`src/components/LicenseCard.jsx`**
   - Reusable license card component
   - Flip animation
   - Download functionality
   - QR code display

2. **`src/pages/PublicLicenseView.jsx`**
   - Public verification page
   - Shows license details
   - Verification status
   - Mobile-friendly

### Modified Files:
1. **`src/pages/UserDashboard.jsx`**
   - Added license state management
   - Generate license function
   - Real license display
   - Removed mock data

2. **`src/App.jsx`**
   - Added public route for license view

3. **`backend/server.js`**
   - License generation API
   - Public license retrieval API

---

## 🔒 Security Features

### Database (RLS Policies):
- Users can view their own licenses
- Public can view licenses by number (for QR scanning)
- Only service role can create/update licenses
- No delete policy (licenses should never be deleted)

### Backend:
- Uses service role key for database operations
- Validates application status before generation
- Checks for duplicate licenses
- Verifies payment completion

---

## 🧪 Testing Guide

### Test License Generation:

1. **Create a test application:**
   - Go to License Application tab
   - Fill out the form
   - Complete all steps

2. **Approve it (as admin):**
   - Login as admin
   - Approve the application
   - Mark payment as completed

3. **Generate license (as user):**
   - Login as user
   - Go to Profile tab
   - Click "Generate License"
   - Wait for success message

4. **Verify:**
   - License card appears
   - Click flip to see back
   - QR code is visible
   - Click download to get PDF

5. **Test QR code:**
   - Scan QR code with phone
   - Should open public verification page
   - Shows license details

---

## 📊 Database Schema

```sql
licenses
├── id (UUID, Primary Key)
├── license_number (VARCHAR, Unique) 
├── application_id (UUID, FK to license_applications)
├── user_id (UUID, FK to auth.users)
├── license_type (VARCHAR)
├── license_category (VARCHAR)
├── full_name_en (VARCHAR)
├── full_name_bn (VARCHAR)
├── nid_number (VARCHAR)
├── date_of_birth (DATE)
├── blood_group (VARCHAR)
├── gender (VARCHAR)
├── address (TEXT)
├── photo_url (TEXT)
├── issue_date (DATE)
├── expiry_date (DATE)
├── status (VARCHAR: active, expired, suspended, revoked)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)
```

---

## 🎯 Key Features Implemented

✅ Dynamic QR code (localhost/network aware)  
✅ Public license verification page  
✅ Real-time notifications (user + admin)  
✅ License generation from approved applications  
✅ Beautiful UI with flip animation  
✅ PDF download functionality  
✅ Normalized database design  
✅ RLS security policies  
✅ Backend API endpoints  
✅ Error handling and validation  

---

## 🔥 Next Steps (Future Enhancements)

1. **Smart Card Integration** (Future)
2. **Tax Token Generation** (Future)
3. **License Renewal System**
4. **Bulk License Generation (Admin)**
5. **License History/Audit Trail**
6. **SMS Notification on Generation**
7. **Email with License Attachment**

---

## 🏆 Championship Ready!

The system is complete and ready for your championship! All features requested are implemented:

1. ✅ Generate license from profile
2. ✅ QR code with dynamic URL (localhost/network)
3. ✅ Public view page after QR scan
4. ✅ Notifications for user and admin (different messages)
5. ✅ Normalized database tables
6. ✅ Same UI/functionality as mock

**Good luck with your championship! 🏆**
