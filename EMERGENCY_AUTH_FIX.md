# EMERGENCY FIX - Session Not Persisting
# This is the REAL fix for your logout issue

## The Problem:
Your session is NOT being saved to localStorage properly

## DO THIS NOW:

### Step 1: Clear EVERYTHING
```powershell
# Stop all servers (Ctrl+C in both terminals)
```

### Step 2: Clear Browser Storage Completely
1. Open http://localhost:3000 (even if not running)
2. Press F12
3. Go to **Application** tab
4. Click **Local Storage** → localhost:3000
5. **Delete ALL items** (right-click → Clear)
6. Click **Session Storage** → Clear ALL
7. Click **Cookies** → Clear ALL
8. Close browser COMPLETELY

### Step 3: Restart Dev Server
```powershell
# Kill any node processes
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force

# Start fresh
npm run dev
```

### Step 4: Login and Check Console
After login, check browser console for:
- ✅ "Supabase client initialized with persistence enabled"
- ✅ "Session found on init: [your email]"
- ✅ "Profile fetched: [your email]"

### Step 5: Check LocalStorage
1. F12 → Application → Local Storage
2. Look for key: `sb-tcqatmkqmvaseakicqkr-auth-token`
3. It should have a JSON value with access_token

### Step 6: Test Refresh
1. Press Ctrl+R
2. Check console for: "Session found on init"
3. You should STAY logged in

---

## If STILL Logging Out:

### Check 1: Verify .env file
```powershell
cat .env
```
Should show:
```
VITE_SUPABASE_URL=https://tcqatmkqmvaseakicqkr.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbG...
```

### Check 2: Browser Console on Refresh
Look for these exact messages:
```
Supabase client initialized with persistence enabled
Session found on init: [email]
Profile fetched: [email]
```

### Check 3: Network Tab
1. F12 → Network
2. Refresh page
3. Look for request to `/rest/v1/profiles`
4. Should return 200 with your profile data

### Check 4: LocalStorage Inspector
Run this in browser console:
```javascript
console.log('Storage key:', Object.keys(localStorage).find(k => k.includes('auth')));
console.log('Session:', localStorage.getItem(Object.keys(localStorage).find(k => k.includes('auth'))));
```

Should show the auth token and session data

---

## What I Changed:

1. **supabaseClient.js** - Changed storage key to Supabase's standard format
2. **AuthContext.jsx** - Completely rewrote auth initialization to handle session properly
3. Added PKCE flow for better security
4. Added detailed console logging

---

## Nuclear Option (if nothing works):

1. Delete node_modules
2. Delete package-lock.json
3. Run: `npm install`
4. Clear browser completely
5. Restart dev server
6. Try again
