# Manual Role Editing Guide

## How to Manually Change User Roles in Supabase

When you need to manually change a user's role (e.g., from 'user' to 'admin' or 'police') through the Supabase Dashboard, follow these steps:

---

## Step 1: Disable Row Level Security (RLS)

Open **Supabase SQL Editor** and run:

```sql
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
```

This temporarily allows you to edit any row in the profiles table.

---

## Step 2: Edit the Role

1. Go to **Table Editor** in Supabase Dashboard
2. Select the **profiles** table
3. Find the user you want to edit
4. Click on the **role** column for that user
5. Change the value to one of:
   - `user` (regular user)
   - `admin` (administrator)
   - `police` (police officer)
6. Click **Save** or press Enter

---

## Step 3: Re-enable Row Level Security (RLS)

Go back to **SQL Editor** and run:

```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
```

This re-enables security so users can only access their own data.

---

## Quick Reference

### Disable RLS (before editing):
```sql
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
```

### Enable RLS (after editing):
```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
```

---

## Available Roles

- **user**: Regular user with access to `/dashboard`
- **admin**: Administrator with access to `/admin`
- **police**: Police officer with access to `/police-dashboard`

---

## Important Notes

- Always re-enable RLS after editing to maintain security
- Users will be automatically redirected to their correct dashboard based on role
- Role changes take effect immediately on next login
