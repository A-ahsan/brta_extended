# 🎯 Live Chat System - Setup Guide

## 📋 Overview
This guide will help you set up the championship-winning Live Chat feature that combines AI chatbot with human admin support.

### ✨ Features Implemented
- **Dual Chat Mode**: Users can choose between AI Bot or Live Admin Support
- **Real-time Messaging**: Instant communication using Supabase Realtime
- **Image Upload**: Max 3 images per chat with auto-compression to 1MB
- **Admin Dashboard**: Complete admin interface with pending/active/closed tabs
- **User Context Sidebar**: Shows user's applications, vehicles, violations during chat
- **Typing Indicators**: Real-time typing status for both users and admins
- **Quick Replies**: 6 pre-written templates for faster response (English/Bangla)
- **Rating System**: 5-star rating with feedback after chat ends
- **Auto-cleanup**: Chats auto-delete 1 day after closure
- **Working Hours**: Notifies users about 10 AM - 5 PM support hours

---

## 🗄️ Step 1: Setup Database

### Execute the SQL Schema
1. Open your Supabase project dashboard
2. Go to **SQL Editor**
3. Copy and paste the entire content from `database/live_chat_schema.sql`
4. Click **Run** to execute

This will create:
- `chat_sessions` table (stores chat metadata, ratings, feedback)
- `chat_messages` table (individual messages with attachments)
- `admin_presence` table (tracks online/offline status)
- `quick_replies` table (pre-written response templates)
- `typing_indicators` table (real-time typing status)
- Auto-assign trigger (assigns chats to available admins)
- Cleanup function (deletes closed chats after 1 day)

### Enable Realtime
In Supabase dashboard:
1. Go to **Database → Replication**
2. Enable realtime for these tables:
   - `chat_sessions`
   - `chat_messages`
   - `admin_presence`
   - `typing_indicators`

---

## 📦 Step 2: Create Storage Bucket

### Setup Image Storage
1. In Supabase dashboard, go to **Storage**
2. Click **Create bucket**
3. Configure:
   - **Name**: `chat-attachments`
   - **Public**: ✅ Yes (so users can view images)
   - **File size limit**: 1 MB
   - **Allowed MIME types**: `image/jpeg`, `image/png`, `image/webp`

### Set Bucket Policies
In the bucket settings, add these policies:

**Policy 1: Upload for authenticated users**
```sql
CREATE POLICY "Users can upload chat images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-attachments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

**Policy 2: Public read access**
```sql
CREATE POLICY "Anyone can view chat images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'chat-attachments');
```

---

## 👨‍💼 Step 3: Set Admin Presence

### Mark Yourself as Online Admin
Before admins can receive chats, they need to set their presence. Add this to AdminPanel or AdminLiveChats:

```javascript
// In AdminLiveChats.jsx, add to useEffect
useEffect(() => {
  // Set admin as online
  const setAdminOnline = async () => {
    await supabase
      .from('admin_presence')
      .upsert({
        admin_id: user.id,
        admin_name: user.full_name || user.email,
        is_online: true,
        current_chats: 0,
        updated_at: new Date().toISOString()
      });
  };

  // Set admin as offline on unmount
  const setAdminOffline = async () => {
    await supabase
      .from('admin_presence')
      .update({ is_online: false })
      .eq('admin_id', user.id);
  };

  setAdminOnline();

  // Heartbeat every 30 seconds
  const interval = setInterval(setAdminOnline, 30000);

  return () => {
    clearInterval(interval);
    setAdminOffline();
  };
}, [user]);
```

---

## 🎨 Step 4: Test the System

### User Flow
1. Open the website as a regular user
2. Click the chatbot floating button (bottom-right)
3. Select language (English or বাংলা)
4. Choose **"Chat with Admin"** option
5. Send a message with text and/or images
6. Wait for admin to respond

### Admin Flow
1. Login as admin
2. Go to **Admin Panel → Live Chats**
3. You'll see the new chat in **Pending** tab
4. Click on the chat to accept it
5. View user context in right sidebar
6. Send messages using:
   - Type manually
   - Use quick replies (lightning icon)
7. Close chat when resolved

### Testing Checklist
- [ ] User can select chat type after language selection
- [ ] User can send text messages
- [ ] User can upload images (max 3, auto-compressed)
- [ ] Admin receives notification for new chat
- [ ] Admin can see user's BRTA data (applications, vehicles, violations)
- [ ] Real-time messaging works both ways
- [ ] Typing indicators appear
- [ ] Admin can use quick replies
- [ ] Chat can be closed by admin
- [ ] User sees rating modal after chat ends
- [ ] Rating is saved in database

---

## 🛠️ Step 5: Customize Quick Replies (Optional)

The system comes with 6 default quick replies in both languages. To add more:

```sql
INSERT INTO quick_replies (text_en, text_bn) VALUES
('Thank you for contacting BRTA. How can I help you today?', 'BRTA-তে যোগাযোগ করার জন্য ধন্যবাদ। আমি আজ আপনাকে কীভাবে সাহায্য করতে পারি?'),
('Your application is being processed. Please wait 2-3 business days.', 'আপনার আবেদন প্রক্রিয়াধীন। অনুগ্রহ করে ২-৩ কার্যদিবস অপেক্ষা করুন।');
```

---

## 🔧 Step 6: Setup Auto-Cleanup (Production)

For production, setup a scheduled job to call the cleanup function:

### Using Supabase Edge Functions
```sql
-- Create cron job (if using pg_cron extension)
SELECT cron.schedule(
  'cleanup-old-chats',
  '0 0 * * *', -- Run daily at midnight
  $$SELECT cleanup_old_chats();$$
);
```

### Alternative: GitHub Actions
Create `.github/workflows/cleanup-chats.yml`:

```yaml
name: Cleanup Old Chats
on:
  schedule:
    - cron: '0 0 * * *' # Daily at midnight UTC

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - name: Call Cleanup Function
        run: |
          curl -X POST '${{ secrets.SUPABASE_URL }}/rest/v1/rpc/cleanup_old_chats' \
          -H "apikey: ${{ secrets.SUPABASE_ANON_KEY }}" \
          -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}"
```

---

## 🎯 Step 7: Update Translations (Optional)

Add live chat translations to `src/utils/translations.js`:

```javascript
export const translations = {
  en: {
    // ... existing translations
    liveChat: {
      title: 'Live Chat Support',
      selectType: 'Choose Chat Type',
      aiBot: 'Chat with AI Bot',
      liveAdmin: 'Chat with Admin',
      adminOnline: 'Admin is online',
      adminOffline: 'Admin is offline',
      workingHours: 'Available: 10 AM - 5 PM (Sun-Thu)',
      rateExperience: 'Rate your experience',
      sendFeedback: 'Send feedback (optional)',
      submit: 'Submit Rating',
    }
  },
  bn: {
    // ... existing translations
    liveChat: {
      title: 'লাইভ চ্যাট সাপোর্ট',
      selectType: 'চ্যাট টাইপ নির্বাচন করুন',
      aiBot: 'AI বটের সাথে চ্যাট করুন',
      liveAdmin: 'অ্যাডমিনের সাথে চ্যাট করুন',
      adminOnline: 'অ্যাডমিন অনলাইন আছেন',
      adminOffline: 'অ্যাডমিন অফলাইন আছেন',
      workingHours: 'উপলব্ধ: সকাল ১০টা - বিকেল ৫টা (রবি-বৃহ)',
      rateExperience: 'আপনার অভিজ্ঞতা মূল্যায়ন করুন',
      sendFeedback: 'মতামত দিন (ঐচ্ছিক)',
      submit: 'রেটিং জমা দিন',
    }
  }
};
```

---

## 🚀 Production Checklist

Before launching to production:

- [ ] Database schema executed successfully
- [ ] Realtime enabled for all chat tables
- [ ] Storage bucket created with correct policies
- [ ] Admin presence heartbeat implemented
- [ ] Tested end-to-end chat flow
- [ ] Quick replies populated
- [ ] Auto-cleanup job scheduled
- [ ] Translations added (if bilingual support needed)
- [ ] Image compression working (max 1MB)
- [ ] Rating system functional
- [ ] Working hours notification showing correctly
- [ ] Admin can view user context (applications, vehicles, violations)

---

## 🎉 Success!

Your live chat system is now ready! Users can choose between AI-powered chatbot for instant answers or connect with live admin support for personalized assistance.

### Key Benefits
✅ **Championship Feature**: Dual-mode chat system sets your project apart  
✅ **Real-time**: Instant messaging with typing indicators  
✅ **Context-Aware**: Admins see full user history during chat  
✅ **Performance**: Auto-cleanup keeps database lean  
✅ **User-Friendly**: Simple image upload with auto-compression  
✅ **Bilingual**: Full English/Bangla support  
✅ **Professional**: Facebook Messenger-style interface with BRTA colors

---

## 🆘 Troubleshooting

### Issue: Chat not appearing in admin panel
**Solution**: Check if admin is marked as online in `admin_presence` table

### Issue: Images not uploading
**Solution**: Verify storage bucket policies and check file size (must be < 1MB after compression)

### Issue: Typing indicators not working
**Solution**: Ensure realtime is enabled for `typing_indicators` table

### Issue: Auto-assignment not working
**Solution**: Check trigger `auto_assign_admin` is created and enabled

### Issue: Messages not appearing in real-time
**Solution**: Verify Supabase Realtime is enabled for `chat_messages` table

---

## 📞 Support

For questions or issues:
1. Check Supabase logs in dashboard
2. Verify all tables have proper RLS policies
3. Test with browser console open to see errors
4. Ensure admin is logged in and online

**Congratulations on building a championship-winning feature! 🏆**
