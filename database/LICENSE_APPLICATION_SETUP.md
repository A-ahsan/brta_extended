# License Application System - Complete Setup Guide

## Overview
This is a championship-level driving license application system with:
- Real NID verification with face extraction
- Auto-form filling from NID mock server
- Real-time bilingual notifications
- Progress tracking with unique UI
- Step-by-step verification process
- Professional animations and transitions

## Database Setup

### Step 1: Run SQL Scripts in Order

1. **NID Mock Server** (if not done already):
   ```sql
   -- Run: database/nid_mock_server_schema.sql
   -- Run: database/nid_mock_server_data.sql
   ```

2. **License Applications Table**:
   ```sql
   -- Run: database/license_applications_schema.sql
   ```

3. **Notifications Table**:
   ```sql
   -- Run: database/notifications_schema.sql
   ```

### Step 2: Create Storage Buckets

Go to Supabase → Storage → Create these buckets (all PUBLIC):

1. **license-nid-images** - For NID front image uploads
2. **license-user-photos** - For user photo uploads  
3. **license-nid-faces** - For extracted face images from NID

### Step 3: Apply Storage Policies

```sql
-- Run: database/storage_policies.sql
```

## System Flow

### User Journey:

1. **Select License Type**
   - Light (Bike) or Motor (Car)
   - Professional or Non-Professional

2. **Upload NID Front Image**
   - System extracts face from NID
   - System extracts NID number via OCR
   - Auto-fetch data from `nid_mock_server` table

3. **Review & Upload Photo**
   - Shows pre-filled form (non-editable)
   - User uploads their photo for license card
   - Submit application

4. **Application Submitted**
   - Real-time notification to user & admin
   - User notification: "Application submitted. Next step: Face verification"
   - Application number generated: DL2025XXXXXX

5. **Progress Tracking**
   - Unique progress tracker UI
   - Shows current step
   - Face Verification button appears
   - Each step has status indicator

6. **Verification Steps** (with tiny URLs):
   - Face Verification → Online Exam → Physical Exam → Payment → Approval

### Admin Journey:

1. **Receive Notification**
   - New application notification
   - Application details link

2. **View Applications**
   - All applications list
   - Filter by status
   - View applicant details
   - Process applications

3. **Track Progress**
   - See application status
   - View completion timestamps
   - Approve/Reject applications

## Application Status Flow

```
pending 
  ↓
nid_verified 
  ↓
face_verified 
  ↓
online_exam_pending 
  ↓
online_exam_passed 
  ↓
physical_exam_pending 
  ↓
physical_exam_passed 
  ↓
payment_pending 
  ↓
payment_completed 
  ↓
approved / rejected
```

## Features

### Bilingual Support
- All notifications in English & Bangla
- Form data in both languages
- UI elements bilingual

### Real-time Notifications
- Stored in database
- User & Admin receive notifications
- Police dashboard NOT notified
- Mark as read functionality
- Priority levels: low, normal, high, urgent

### Progress Tracking
- Visual progress bar
- Step indicators
- Completion timestamps
- Action buttons for next steps

### Image Processing
- NID face extraction (simulated with cropping)
- NID number OCR extraction (mock implementation)
- Image upload to Supabase Storage
- Public URL generation

### Auto-form Filling
- Extract NID number from image
- Query `nid_mock_server` table
- Pre-fill all user data
- Non-editable form fields
- Only photo upload required from user

## Database Tables

### license_applications
- Stores complete application data
- NID information from mock server
- Image URLs (NID, face, user photo)
- Status tracking
- Step URLs (tiny URLs for each verification step)
- Timestamps for each completion stage

### notifications  
- Bilingual content
- User/Admin/Police targeting
- Application linking
- Read status tracking
- Priority levels

### nid_mock_server
- Mock NID database
- Used for auto-filling forms
- Contains: NID number, names (EN/BN), family info, address, etc.

## Components to be Created

1. **NewApplicationModal** (Enhanced)
   - Multi-step form
   - License type selection
   - NID upload & processing
   - Auto-form filling
   - Photo upload
   - Review & submit

2. **ProgressTracker**
   - Visual progress component
   - Step indicators
   - Action buttons
   - Status badges

3. **NotificationPanel** (Enhanced)
   - Real-time notifications
   - Click-to-close functionality
   - Mark as read
   - Priority-based styling

4. **ApplicationCard**
   - Display application details
   - Progress overview
   - Action buttons

## Professional UI/UX Features

- Smooth transitions between steps
- Loading states with animations
- Success/error feedback
- Skeleton loaders
- Toast notifications
- Gradient backgrounds
- Glass-morphism effects
- Micro-interactions
- Hover effects
- Dark mode support

## Testing

### Test NID Numbers (from mock server):
- `1234567890123` - Ahmed Hassan Khan
- `9876543210987` - Ayesha Rahman
- `5678901234567` - Mohammad Karim Uddin
- `2345678901234` - Nusrat Jahan
- `8901234567890` - Rafiqul Islam

### Test Flow:
1. Login as user
2. Click "New Application"
3. Select Light/Professional
4. Upload NID image containing one of the test NID numbers
5. System auto-fills form
6. Upload user photo
7. Submit application
8. Check notifications (bell icon)
9. View application progress
10. Login as admin to see admin notification

---

**Championship Level**: Every detail matters! 🏆
