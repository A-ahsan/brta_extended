# 📱 Telegram Integration Setup Guide

## ✅ What's Been Implemented:

### Backend Files:
- ✅ **telegramService.js** - Handles Telegram posting with HTML formatting
- ✅ **server.js** - Added API endpoints `/api/telegram/post-report` and `/api/telegram/test`
- ✅ **package.json** - Installed `node-telegram-bot-api`

### Frontend Files:
- ✅ **AdminCommunityModeration.jsx** - Integrated Telegram posting on approval

### Features:
- ✅ Posts ONLY approved dalal reports to Telegram (suggestions stay admin-only)
- ✅ Supports up to 5 images per post
- ✅ Beautiful HTML formatting with emojis
- ✅ Shows: Title, Description, Location, Date, Reporter Name (or Anonymous)
- ✅ Includes hashtags: #DalalReport #BRTA #Community #Transport
- ✅ Works with both @username and numeric channel IDs

---

## 🔧 Setup Instructions:

### Step 1: Add Environment Variables to Render

Go to your **Render Dashboard** → Your backend service → **Environment**

Add these 2 variables:

```
TELEGRAM_BOT_TOKEN=767070082:AAFQy_nejElgkfXWQWPfv28QEOfIA_R8DJo
TELEGRAM_CHANNEL_ID=@brta2o
```

Click **Save Changes** - Render will auto-redeploy your backend.

---

### Step 2: Update Local Backend .env

Add to `backend/.env`:

```env
# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=767070082:AAFQy_nejElgkfXWQWPfv28QEOfIA_R8DJo
TELEGRAM_CHANNEL_ID=@brta2o
```

---

### Step 3: Test Locally (Optional)

```bash
cd backend
npm start
```

Then visit: http://localhost:5000/api/telegram/test

You should see:
```json
{
  "success": true,
  "message": "Telegram bot connected successfully"
}
```

---

### Step 4: Deploy to Production

```bash
# From project root
git add .
git commit -m "feat: Add Telegram integration for community reports"
git push
```

- **Frontend** (Vercel) - Auto-deploys on push
- **Backend** (Render) - Auto-deploys when you save env variables

---

## 🧪 How to Test:

### Test 1: Local Testing

1. Start backend: `cd backend && npm start`
2. Start frontend: `npm run dev`
3. Login as admin
4. Go to Admin Panel → Community Moderation
5. Approve a dalal report
6. Check your Telegram channel `@brta2o`

### Test 2: Production Testing

1. Wait for both deployments to complete
2. Go to your live site
3. Login as admin
4. Approve a dalal report
5. Check Telegram channel

---

## 📝 What Gets Posted to Telegram:

**Format:**
```
🚨 New Dalal Report Alert 🚨

📌 Title: [Report Title]

📝 Description:
[Full description of the incident]

📍 Location: [Location details]

📅 Incident Date: DD/MM/YYYY

👤 Reported By: [Name or Anonymous]

⚠️ This report has been reviewed and verified by BRTA administration.

#DalalReport #BRTA #Community #Transport
```

**Images:** Up to 5 photos will be posted as a media group

---

## 🔍 Troubleshooting:

### "Failed to post to Telegram"

**Check:**
1. Bot is admin in channel? ✅
2. Bot has "Post Messages" permission? ✅
3. Environment variables set in Render? ✅
4. Backend redeployed after env variables? ✅

**View logs in Render:**
- Dashboard → Your service → Logs
- Look for: `✅ Posted report with X images to Telegram channel`
- Or errors: `❌ Failed to post to Telegram channel`

### Bot can't send messages

**Fix:**
1. Go to Telegram channel settings
2. Check bot is in Administrators list
3. Make sure "Post Messages" permission is enabled
4. Try removing and re-adding the bot

### Channel ID issues

**If @brta2o doesn't work:**
1. Forward a channel message to `@userinfobot`
2. Get numeric ID like `-1001234567890`
3. Update env variable: `TELEGRAM_CHANNEL_ID=-1001234567890`

---

## 🎯 Important Notes:

✅ **Only dalal reports** are posted to Telegram (not suggestions)
✅ **Admin approval required** - Nothing posts automatically
✅ **Non-blocking** - If Telegram fails, approval still succeeds
✅ **Secure** - Bot token is server-side only (never exposed to frontend)
✅ **HTML safe** - All text is escaped to prevent injection

---

## 📊 Monitoring:

**Backend Logs (Render):**
- `✅ Posted report with X images to Telegram channel` - Success
- `❌ Failed to post to Telegram channel` - Error
- `Telegram API Error: [details]` - Specific error from Telegram

**Admin Console (Browser):**
- `✅ Successfully posted to Telegram channel` - Success
- `⚠️ Failed to post to Telegram channel` - Warning
- Errors logged to console with full details

---

## 🚀 Ready to Test!

Your Telegram integration is complete and ready to use. Just:

1. Add env variables to Render
2. Wait for auto-deploy
3. Approve a dalal report
4. See it appear in @brta2o channel!

---

**Need help?** Check backend logs in Render Dashboard → Logs
