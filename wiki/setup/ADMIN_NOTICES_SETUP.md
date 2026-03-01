# Admin Notices Management System - Setup Guide

## Overview
Complete admin panel for managing notices with real-time updates to homepage ticker and notices page.

## Features Implemented
✅ Full CRUD operations (Create, Read, Update, Delete)
✅ Bilingual support (English & Bengali)
✅ Real-time updates using Supabase realtime
✅ Homepage ticker integration
✅ Category filtering
✅ Trending notices
✅ Active/Inactive status
✅ Badge system (NEW, URGENT, SCHEDULE, etc.)
✅ No RLS - Public access for reading, admin control for editing

## Files Created/Modified

### 1. Database Schema
**File**: `database/notices_schema.sql`
- Creates `notices` table with all required fields
- Includes sample data (5 notices)
- No RLS (Row Level Security) - as requested
- Real-time subscriptions enabled

### 2. Admin Management Page
**File**: `src/pages/AdminNotices.jsx`
- Full admin interface for managing notices
- Create, edit, delete notices
- Toggle active/trending status
- Real-time stats dashboard
- Bilingual form with validation

### 3. Updated Components
**Files Modified**:
- `src/components/NoticesTicker.jsx` - Now fetches from database
- `src/pages/Notices.jsx` - Now fetches from database
- `src/App.jsx` - Added route for `/admin/notices`
- `src/pages/AdminPanel.jsx` - Added "Notices" menu item

## Setup Instructions

### Step 1: Run Database Schema
```sql
-- Go to Supabase Dashboard > SQL Editor
-- Copy and paste the content from: database/notices_schema.sql
-- Click "Run"
```

This will:
- Create the `notices` table
- Insert 5 sample notices
- Set up indexes for performance
- Enable real-time subscriptions

### Step 2: Access Admin Notices Panel
1. Login as Admin
2. Navigate to: `/admin/notices` or
3. Click "Notices" from Admin Panel sidebar

### Step 3: Test the System

#### Test Homepage Ticker:
1. Go to homepage
2. You should see notices scrolling in the ticker
3. Create/edit a notice with "Show in Ticker" checked
4. Notice should appear immediately (real-time)

#### Test Notices Page:
1. Go to `/notices`
2. All active notices should display
3. Filter by category
4. Click to view full details

#### Test Admin Controls:
1. Go to `/admin/notices`
2. Create a new notice (bilingual)
3. Edit existing notice
4. Toggle active/inactive status
5. Mark as trending
6. Delete notice

## Database Structure

```sql
notices table:
├── id (uuid, primary key)
├── title_en (text) - English title
├── title_bn (text) - Bengali title
├── excerpt_en (text) - English summary
├── excerpt_bn (text) - Bengali summary
├── content_en (text) - English full content
├── content_bn (text) - Bengali full content
├── category (varchar) - general, license, vehicle, tax, exam, maintenance
├── badge (varchar) - NEW, SCHEDULE, EXTENDED, UPDATE, NOTICE, URGENT, IMPORTANT
├── is_active (boolean) - Show/hide notice
├── is_trending (boolean) - Mark as trending
├── show_in_ticker (boolean) - Display in homepage ticker
├── publish_date (timestamp)
├── created_at (timestamp)
├── updated_at (timestamp)
├── created_by (uuid) - References auth.users
└── updated_by (uuid) - References auth.users
```

## Features Breakdown

### Admin Panel Features:
- ✅ Statistics dashboard (Total, Active, Trending, In Ticker)
- ✅ List view with all notices
- ✅ Quick actions (Edit, Delete, Toggle Status)
- ✅ Modal form for create/edit
- ✅ Bilingual input fields
- ✅ Category selection
- ✅ Badge selection
- ✅ Status toggles (Active, Trending, Show in Ticker)

### Homepage Ticker Features:
- ✅ Auto-scrolling notices
- ✅ Pause on hover
- ✅ Click to navigate to full notices page
- ✅ Real-time updates
- ✅ Only shows active notices with `show_in_ticker = true`
- ✅ Displays badge if present

### Notices Page Features:
- ✅ Category filtering
- ✅ Grid layout with cards
- ✅ Trending badge
- ✅ Click to view full details
- ✅ Modal for full content
- ✅ Real-time updates
- ✅ Only shows active notices

## Usage Examples

### Create a New Notice
1. Click "Create Notice" button
2. Fill in all fields (English & Bengali)
3. Select category
4. Optional: Add badge (NEW, URGENT, etc.)
5. Check/uncheck:
   - Active (visible to users)
   - Mark as Trending
   - Show in Homepage Ticker
6. Click "Create Notice"

### Edit Notice
1. Click pencil icon on any notice
2. Modify fields as needed
3. Click "Update Notice"

### Delete Notice
1. Click trash icon
2. Confirm deletion

### Toggle Active Status
1. Click eye icon to activate/deactivate
2. Deactivated notices won't show on frontend

### Mark as Trending
1. Click trend icon
2. Trending notices show special badge

## Real-time Features

All components subscribe to Supabase real-time:
- Any change in admin panel updates instantly
- Homepage ticker updates automatically
- Notices page refreshes in real-time
- Multiple admins can work simultaneously

## Security

- **No RLS** as requested - open read access
- Admin routes protected by `ProtectedRoute` component
- Only authenticated admins can access `/admin/notices`
- User role checked on component mount

## Tips for Admins

1. **Use Categories**: Helps users filter notices
2. **Add Badges**: Makes important notices stand out
3. **Use Ticker Wisely**: Don't overload homepage ticker
4. **Mark Trending**: Highlight important announcements
5. **Bilingual Required**: Always fill both EN and BN fields
6. **Activate After Review**: Create as inactive, activate when ready

## Troubleshooting

### Ticker not showing notices:
- Check if notices have `is_active = true`
- Check if notices have `show_in_ticker = true`
- Verify database connection

### Real-time not working:
- Check Supabase realtime is enabled
- Check table is in publication: `supabase_realtime`
- Refresh the page

### Admin panel not accessible:
- Verify user role is 'admin'
- Check route protection in App.jsx
- Clear browser cache

## Next Steps (Optional Enhancements)

- [ ] Rich text editor for content
- [ ] Image upload for notices
- [ ] Schedule publish date (future publishing)
- [ ] Archive old notices
- [ ] Analytics (views, clicks)
- [ ] Email notifications on new notice
- [ ] Multi-language support (add more languages)

## API Reference

### Fetch Active Notices
```javascript
const { data, error } = await supabase
  .from('notices')
  .select('*')
  .eq('is_active', true)
  .order('publish_date', { ascending: false });
```

### Fetch Ticker Notices
```javascript
const { data, error } = await supabase
  .from('notices')
  .select('title_en, title_bn, badge')
  .eq('is_active', true)
  .eq('show_in_ticker', true)
  .order('publish_date', { ascending: false });
```

### Create Notice
```javascript
const { error } = await supabase
  .from('notices')
  .insert([formData]);
```

### Update Notice
```javascript
const { error } = await supabase
  .from('notices')
  .update(formData)
  .eq('id', noticeId);
```

### Delete Notice
```javascript
const { error } = await supabase
  .from('notices')
  .delete()
  .eq('id', noticeId);
```

---

**Implementation Date**: November 28, 2025
**Status**: ✅ Complete and Ready to Use
**Database**: Supabase with Real-time
**No RLS**: Public read access, admin-only write
