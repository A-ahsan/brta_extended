# ⚡ QUICK FIX - 3 STEPS ONLY

## Your Problem:
Payment completes but license_applications table doesn't update → Can't generate license

## Solution (3 minutes total):

### 1️⃣ SUPABASE FIX (2 min)
```
Open Supabase → SQL Editor → Run this file:
database/fix_payment_update_issue.sql

Wait for: ✅ SUCCESS: All RLS policies disabled
```

### 2️⃣ RESTART BACKEND (30 sec)
```powershell
Ctrl+C (in backend terminal)
cd backend
node server.js
```

### 3️⃣ TEST (30 sec)
```
Make payment → Check if payment flag = 1 → Generate license
```

---

## That's it! 🎉

**What if it still fails?**
Run diagnostic: `database/diagnostic_payment_license.sql`
Check section: "PROBLEM PAYMENTS"

**Files to read if you want details:**
- `URGENT_PAYMENT_FIX.md` - Quick guide
- `PAYMENT_LICENSE_FIX_GUIDE.md` - Complete guide
- `FIX_SUMMARY.md` - Technical details

**Backend Logs to Watch:**
```
✅ License application payment updated successfully ← GOOD
❌ Error updating license application payment ← BAD
```

---

**Next:** Run Step 1 in Supabase now!
