# Route Permit - Frontend Integration Snippets

## 1. Update src/components/UserDashboard.jsx

Find the menu items array (around line 100-150) and add this item:

```javascript
{
  icon: FaRoute,
  label: currentLang === 'en' ? 'Route Permits' : 'রুট পারমিট',
  labelEn: 'Route Permits',
  labelBn: 'রুট পারমিট',
  onClick: () => navigate('/route-permits')
},
```

## 2. Update src/pages/admin/AdminPanel.jsx

Add import at the top:
```javascript
import AdminRoutePermits from './AdminRoutePermits';
```

Find the tabs array (around line 80-150) and add:

```javascript
{ 
  id: 'route-permits', 
  iconEn: '🛣️', 
  iconBn: '🛣️', 
  labelEn: 'Route Permits', 
  labelBn: 'রুট পারমিট' 
},
```

In the renderContent function, add this case:

```javascript
case 'route-permits':
  return <AdminRoutePermits />;
```

## 3. Update src/App.jsx

Add import at the top:
```javascript
import PublicRoutePermitVerification from './pages/PublicRoutePermitVerification';
import UserRoutePermits from './pages/UserRoutePermits';
```

Add these routes in the Routes section:

```javascript
{/* Public Route Permit Verification - No Auth Required */}
<Route path="/verify-route-permit/:permitNumber" element={<PublicRoutePermitVerification />} />

{/* User Route Permits - Protected */}
<Route
  path="/route-permits"
  element={
    <ProtectedRoute allowedRoles={['user']}>
      <UserRoutePermits />
    </ProtectedRoute>
  }
/>
```

## 4. Add Leaflet CSS to index.html

In `index.html`, add this in the `<head>` section:

```html
<!-- Leaflet CSS -->
<link 
  rel="stylesheet" 
  href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
  integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
  crossorigin=""
/>
```

## Complete Integration Steps

1. **Install Packages**:
   ```bash
   npm install leaflet react-leaflet qrcode
   ```

2. **Database Setup**:
   - Go to Supabase Dashboard → SQL Editor
   - Run all queries from `database/route_permits_system.sql`

3. **Backend Integration**:
   - Follow `ROUTE_PERMIT_CODE_SNIPPETS.md` to update:
     - `backend/server.js` (add payment endpoint)
     - `backend/updatePayment.js` (add notification logic)

4. **Frontend Integration**:
   - Follow this file to update:
     - `src/components/UserDashboard.jsx` (add menu item)
     - `src/pages/admin/AdminPanel.jsx` (add admin tab)
     - `src/App.jsx` (add routes)
     - `index.html` (add Leaflet CSS)

5. **Restart Services**:
   ```bash
   # Stop both servers (Ctrl+C)
   # Start backend
   cd backend
   node server.js
   
   # Start frontend (in new terminal)
   npm run dev
   ```

6. **Testing Checklist**:
   - [ ] User can see "Route Permits" in sidebar
   - [ ] Can open application modal and select vehicle
   - [ ] Map loads and allows route selection
   - [ ] Distance calculates correctly
   - [ ] Fee displays properly based on vehicle type
   - [ ] Can upload document
   - [ ] Payment redirect works
   - [ ] After payment, permit appears in user's list
   - [ ] Admin can see permit in admin panel
   - [ ] Admin can approve/reject with bilingual reason
   - [ ] QR code generates on approval
   - [ ] Public verification page works (scan QR)
   - [ ] PDF download works
   - [ ] Expired permits show correct status

## Import Icon (if needed)

If `FaRoute` is not imported in UserDashboard.jsx, add:

```javascript
import { FaRoute } from 'react-icons/fa';
```

## Quick Test Route

After integration, test by:
1. Login as user
2. Click "Route Permits" in sidebar
3. Click "Apply for Route Permit"
4. Select a registered vehicle
5. Click on map to select start/end points
6. Upload a document (PDF/Image)
7. Enter reason
8. Check calculated fee
9. Click "Proceed to Payment"
10. Complete payment
11. Login as admin
12. Go to "Route Permits" tab
13. Review and approve the application
14. Back as user - download PDF with QR code
15. Scan QR or visit public verification link

All done! 🚀
