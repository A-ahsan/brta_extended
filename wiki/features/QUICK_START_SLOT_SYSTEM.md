# 🚀 Quick Start - Slot Availability System

## Run This SQL File First!

**File**: `database/add_slot_availability_system.sql`

### Option 1: Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Select your project
3. Click "SQL Editor" in left sidebar
4. Click "New Query"
5. Copy-paste entire contents of `database/add_slot_availability_system.sql`
6. Click "Run" (or press Ctrl+Enter)

### Option 2: Command Line
```bash
# If you have Supabase CLI installed:
supabase db push

# Or using psql:
psql -h [your-db-host] -U postgres -d postgres -f database/add_slot_availability_system.sql
```

---

## ✅ Verify Installation

Run this query to check if functions exist:

```sql
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name IN (
  'get_booking_count',
  'get_available_slots', 
  'has_availability',
  'get_slot_info',
  'check_booking_capacity'
)
AND routine_schema = 'public';
```

You should see 5 functions listed.

---

## 🧪 Test the System

### Test 1: Check Availability for a Center
```sql
-- Replace UUID with your actual center ID
SELECT get_slot_info(
  'your-center-uuid-here'::UUID,
  CURRENT_DATE + INTERVAL '1 day'
);
```

Expected output:
```json
{
  "total_capacity": 50,
  "booked": 0,
  "available": 50,
  "rush_level": "low",
  "is_full": false,
  "percentage_filled": 0.00
}
```

### Test 2: Try Overbooking (Should Fail)
```sql
-- First, find a center and date
SELECT id, center_name_en, daily_capacity 
FROM test_centers 
LIMIT 1;

-- Try to create more bookings than capacity
-- This should raise an error when capacity is reached
```

---

## 🎯 What's New?

### User Experience:
- See slot availability when booking: "25/50 slots available"
- Full dates are disabled and marked "(FULL)"
- Visual progress bars and rush indicators
- Can't accidentally book full dates

### Admin Dashboard:
- See capacity at a glance: "18/50 booked"
- FULL badges on fully booked centers
- Color-coded rush levels (green/yellow/orange/red)
- Accurate percentage filled

### Database Protection:
- Automatic prevention of overbooking
- Trigger enforces capacity limits
- Transaction-safe booking validation

---

## 📱 How to Use

### As a User:
1. Go to your dashboard
2. Click "Schedule Physical Exam" 
3. Select a test center
4. **NEW**: See slot availability for each date
5. Choose a date with available slots
6. Book your exam

### As an Admin:
1. Go to Admin → Test Slots
2. Select a date
3. **NEW**: See capacity stats for each center
4. View bookings by clicking "View Details"
5. Monitor which centers are filling up

---

## 🔧 Customize Capacity

To change a center's daily capacity:

```sql
UPDATE test_centers 
SET daily_capacity = 100  -- New capacity
WHERE center_name_en = 'Dhaka Central Test Center';
```

Default capacity is 50 slots per center per day.

---

## 📊 Useful Queries

### See all centers with availability for tomorrow:
```sql
SELECT 
  center_name_en,
  get_slot_info(id, CURRENT_DATE + 1) as slot_info
FROM test_centers
WHERE is_active = true;
```

### Find dates when a center is fully booked:
```sql
SELECT 
  exam_date,
  COUNT(*) as booked,
  tc.daily_capacity,
  (COUNT(*) >= tc.daily_capacity) as is_full
FROM physical_exam_bookings peb
JOIN test_centers tc ON peb.test_center_id = tc.id
WHERE peb.status = 'scheduled'
  AND tc.center_name_en = 'Dhaka Central Test Center'
GROUP BY exam_date, tc.daily_capacity
ORDER BY exam_date;
```

### Get rush level for next 7 days:
```sql
SELECT 
  exam_date,
  COUNT(*) as bookings,
  get_center_rush_level(test_center_id, exam_date) as rush_level
FROM physical_exam_bookings
WHERE status = 'scheduled'
  AND exam_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 7
GROUP BY exam_date, test_center_id
ORDER BY exam_date;
```

---

## 🎉 You're All Set!

The slot availability system is now active. Users will see real-time availability and won't be able to book full slots.

**See SLOT_AVAILABILITY_SYSTEM.md for detailed documentation.**
