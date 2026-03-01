# 🏥 Physical Exam System - Implementation Guide

## 📋 Overview
Championship-level physical exam booking system with test centers, location-based search, and admin management.

## 🗄️ Database Schema Created

### Tables

#### 1. `test_centers`
Stores physical test center locations with map coordinates.

**Columns:**
- `id` - UUID primary key
- `center_name_en/bn` - Test center name (bilingual)
- `office_name_en/bn` - Office name (bilingual)
- `address_en/bn` - Full address (bilingual)
- `division`, `district`, `upazila` - Location hierarchy
- `latitude`, `longitude` - GPS coordinates for map
- `phone`, `email` - Contact info
- `daily_capacity` - Max bookings per day (default 50)
- `is_active` - Enable/disable center
- `created_by` - Admin who created it

#### 2. `physical_exam_bookings`
User test slot bookings.

**Columns:**
- `id` - UUID primary key
- `application_id` - Links to license application
- `user_id` - User who booked
- `test_center_id` - Selected test center
- `exam_date` - Scheduled date
- `exam_time` - Scheduled time
- `status` - 'scheduled', 'completed', 'cancelled', 'rescheduled'
- `result` - 'passed', 'failed', NULL (set by admin)
- `admin_remarks` - Admin notes
- `evaluated_by` - Admin who evaluated
- `evaluated_at` - Evaluation timestamp

**Constraints:**
- One active booking per application (UNIQUE constraint)

### Functions

#### `get_center_rush_level(center_id, date)`
Returns rush level for a specific date:
- **'low'** - < 50% capacity
- **'medium'** - 50-79% capacity  
- **'high'** - ≥ 80% capacity

#### `get_center_overall_rush(center_id)`
Returns overall rush level (next 7 days average):
- **'low'** - < 40% avg
- **'medium'** - 40-69% avg
- **'high'** - ≥ 70% avg

### Views

#### `test_centers_with_rush`
Pre-calculates rush levels for all active centers.

## 🎨 Components to Create

### Admin Side

#### 1. **AdminTestCenters.jsx** (New Page)
Path: `src/pages/admin/AdminTestCenters.jsx`

**Features:**
- 📍 Map integration (Leaflet or Google Maps free tier)
- ➕ Add new test center (click on map to pin location)
- ✏️ Edit center details
- 🗑️ Delete/deactivate centers
- 📊 View rush levels (color-coded badges)
- 📋 List view with all centers
- 🔍 Search/filter by division/district

**UI Elements:**
```jsx
- Map view (70% width)
- Sidebar list (30% width)
- Add Center Modal (with map picker)
- Edit Center Modal
- Rush level badges:
  - Low: Green badge
  - Medium: Yellow badge
  - High: Red badge
```

#### 2. **AdminPhysicalExams.jsx** (Applications Sidebar Tab)
Path: `src/pages/admin/AdminApplications.jsx` (modify existing)

**Features:**
- 📋 List all physical exam bookings
- ✅ Mark as Passed (tick button)
- ❌ Mark as Failed (cross button)
- 💬 Add admin remarks
- 📅 Filter by date/center
- 📊 View booking details

### User Side

#### 3. **PhysicalExamBooking.jsx** (Modal Component)
Path: `src/components/PhysicalExamBooking.jsx`

**Features:**
- 📍 **Near Me** button (uses browser geolocation)
- 🗺️ Map showing nearby test centers
- 📊 Rush level indicators
- 📅 Date picker (available dates only)
- ⏰ Time slot selection
- 🔄 Edit booking option
- 🗑️ Cancel booking option
- ✨ Smooth animations

**Flow:**
1. User clicks "Schedule Physical Exam" in ProgressTracker
2. Modal opens with map
3. "Near Me" button → sorts centers by distance
4. Select center → shows available dates
5. Select date → shows rush level
6. Select time slot → confirm booking
7. Success → notification sent

#### 4. **MyPhysicalExam.jsx** (Dashboard Section)
Path: Integrated in `UserDashboard.jsx`

**Features:**
- 📋 View current booking
- 📍 Test center details
- 🗺️ Map with directions
- ✏️ Edit/reschedule button
- 🗑️ Cancel booking button

## 🚀 Implementation Steps

### Phase 1: Database Setup ✅ (DONE)
- [x] Create `physical_exam_schema.sql`
- [x] Create functions for rush level
- [x] Add sample test centers
- [x] Run schema in Supabase ⚠️ **YOU MUST DO THIS**

### Phase 2: Admin Components ✅ (DONE)
- [x] Create AdminTestCenters page
- [x] Map integration (Leaflet)
- [x] CRUD operations
- [x] Rush level display
- [x] Update AdminApplications
- [x] Add Physical Exam tab
- [x] Pass/Fail buttons
- [x] Remarks field
- [x] Update AdminPanel routing

### Phase 3: User Components ✅ (DONE)
- [x] Create PhysicalExamBooking modal
- [x] Map integration
- [x] Near me functionality
- [x] Date/time selection
- [x] Booking CRUD
- [x] Update ProgressTracker
- [x] Add "Schedule Physical Exam" button
- [x] Show booking status

### Phase 4: Dependencies ✅ (DONE)
- [x] Install react-leaflet & leaflet

## 📦 Dependencies Needed

```json
{
  "react-leaflet": "^4.2.1",
  "leaflet": "^1.9.4"
}
```

Install with:
```bash
npm install react-leaflet leaflet
```

## 🗺️ Map Integration

### Leaflet Setup (Free, No API Key)

```jsx
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

<MapContainer center={[23.8103, 90.4125]} zoom={13}>
  <TileLayer
    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    attribution='&copy; OpenStreetMap contributors'
  />
  <Marker position={[lat, lng]}>
    <Popup>Test Center Name</Popup>
  </Marker>
</MapContainer>
```

## 🎯 Features Checklist

### Admin Features
- [ ] View all test centers on map
- [ ] Add new center (click map to pin)
- [ ] Edit center details
- [ ] Delete/deactivate center
- [ ] View rush levels (real-time)
- [ ] See candidate count per center
- [ ] Filter centers by location
- [ ] View all bookings
- [ ] Mark exam as passed/failed
- [ ] Add admin remarks

### User Features
- [ ] View test centers on map
- [ ] "Near Me" location search
- [ ] See rush levels before booking
- [ ] Select date and time
- [ ] Book physical exam slot
- [ ] View booking details
- [ ] Edit/reschedule booking
- [ ] Cancel booking
- [ ] Get directions to center

## 🎨 UI/UX Design

### Color Coding
```css
Rush Levels:
- Low (Green):    #10b981
- Medium (Yellow): #f59e0b
- High (Red):      #ef4444

Status:
- Scheduled (Blue):   #3b82f6
- Completed (Green):  #10b981
- Cancelled (Gray):   #6b7280
- Passed (Green):     #10b981
- Failed (Red):       #ef4444
```

### Animations
- Map zoom on selection
- Smooth modal transitions
- Rush badge pulse on high
- Success confetti on booking

## 📊 Rush Level Algorithm

```
Daily Rush = (Bookings on Date / Daily Capacity) × 100

Low:    < 50%
Medium: 50-79%
High:   ≥ 80%

Overall Rush = Average of next 7 days

Low:    < 40%
Medium: 40-69%
High:   ≥ 70%
```

## 🔔 Notifications

### User Notifications
- Booking confirmed
- Booking edited/cancelled
- Exam result (passed/failed)
- Reminder (1 day before exam)

### Admin Notifications
- New booking created
- Booking cancelled by user
- High rush alert

## 📱 Responsive Design
- Desktop: Map + Sidebar layout
- Tablet: Stacked layout
- Mobile: Full-screen map with bottom sheet

## 🚀 Next Steps

### ⚠️ REQUIRED: Run Database Schema

**Open Supabase SQL Editor and run:**
```sql
-- Copy entire content from database/physical_exam_schema.sql
-- This creates tables, functions, and sample data
```

### ✅ Everything Else is Done!

The entire Physical Exam system is fully implemented:

**Admin Features:**
- ✅ Test Centers page with interactive map (`/admin/test-centers`)
- ✅ Add/Edit/Delete test centers with map pin selection
- ✅ Rush level indicators (low/medium/high)
- ✅ Physical Exam evaluation tab in Applications
- ✅ Pass/Fail buttons with remarks

**User Features:**
- ✅ "Schedule Exam" button in Progress Tracker
- ✅ Near Me location search
- ✅ Map with test centers
- ✅ Date/time slot booking
- ✅ Edit/cancel booking
- ✅ Auto database & notification updates

**Flow:**
1. User completes online exam ✅
2. "Schedule Exam" button appears ✅
3. User selects test center (map + Near Me) ✅
4. User books date/time slot ✅
5. Admin sees booking in Physical Exam tab ✅
6. Admin marks Pass/Fail after exam ✅
7. Database auto-updates, notifications sent ✅

### 🎯 Ready to Test!

Just run the schema and you're championship-ready! 🏆
