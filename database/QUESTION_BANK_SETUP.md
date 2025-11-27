# Question Bank System Setup Guide

## Overview
This guide will help you set up the Question Bank system for the BRTA Extended application. The system supports bilingual (English/Bangla) MCQ and Road Sign questions with admin management.

## Database Setup

### Step 1: Create Supabase Storage Bucket (for Road Sign images)
1. Go to your Supabase project dashboard
2. Navigate to **Storage**
3. Create a new bucket named `question-images`
4. Make it **public** for easy image access

### Step 2: Create Questions Table
Run the SQL script from `database/questions_schema.sql` in your Supabase SQL Editor:

```sql
-- Copy and paste the entire content from database/questions_schema.sql
```

This will create:
- `questions` table with all necessary columns
- Indexes for better query performance
- Auto-update trigger for `updated_at` column
- **NO RLS policies** (as requested for easy database editing)

### Step 3: Import Initial Questions
Run the SQL script from `database/questions_data.sql` in your Supabase SQL Editor:

```sql
-- Copy and paste the entire content from database/questions_data.sql
```

This will insert 6 sample questions from your `public/question.txt` file:
1. Which side of the road should you drive on in Bangladesh?
2. What is the legal minimum age to drive a motorcycle?
3. Before overtaking another vehicle, you must:
4. What does a red traffic light mean?
5. What is the purpose of a zebra crossing?
6. What should you do when driving in heavy rain?

## Features

### For Users (User Dashboard)
- **Question Bank** sidebar option
- View all active questions
- Filter by question type (All, MCQ, Road Signs)
- Search questions in both English and Bangla
- Interactive question cards with:
  - Select answer
  - Check answer button
  - Immediate feedback (correct/incorrect)
  - Bilingual display

### For Admins (Admin Panel)
- **Questions** sidebar option
- Full CRUD operations:
  - ✅ **Add** new questions (MCQ or Road Sign)
  - ✏️ **Edit** existing questions
  - 🗑️ **Delete** questions
  - 👁️ **View** all questions with filters
- Statistics dashboard showing:
  - Total questions count
  - MCQ questions count
  - Road Sign questions count
  - Active questions count
- **Image Upload** for Road Sign questions
- Bilingual form fields for both English and Bangla
- Active/Inactive status toggle
- Search and filter functionality

## Question Table Schema

```sql
id: UUID (primary key)
question_text_en: TEXT (English question)
question_text_bn: TEXT (Bangla question)
question_type: VARCHAR (mcq or road_sign)
image_url: TEXT (for road sign images)
option_a_en: TEXT (Option A in English)
option_a_bn: TEXT (Option A in Bangla)
option_b_en: TEXT (Option B in English)
option_b_bn: TEXT (Option B in Bangla)
option_c_en: TEXT (Option C in English)
option_c_bn: TEXT (Option C in Bangla)
option_d_en: TEXT (Option D in English)
option_d_bn: TEXT (Option D in Bangla)
correct_answer: CHAR (A, B, C, or D)
is_active: BOOLEAN (show/hide question)
created_at: TIMESTAMP
updated_at: TIMESTAMP
```

## How to Add More Questions

### Method 1: Using Admin Panel (Recommended)
1. Login as admin
2. Go to Admin Panel → Questions
3. Click "+ Add Question" button
4. Fill in the bilingual form:
   - Question text (English & Bangla)
   - Question type (MCQ or Road Sign)
   - Upload image (if Road Sign)
   - All 4 options (English & Bangla)
   - Select correct answer
   - Set active status
5. Click "Add Question"

### Method 2: Direct SQL INSERT
```sql
INSERT INTO questions (
  question_text_en,
  question_text_bn,
  question_type,
  option_a_en,
  option_a_bn,
  option_b_en,
  option_b_bn,
  option_c_en,
  option_c_bn,
  option_d_en,
  option_d_bn,
  correct_answer,
  is_active
) VALUES (
  'Your English question here',
  'আপনার বাংলা প্রশ্ন এখানে',
  'mcq',
  'Option A English',
  'বিকল্প এ বাংলা',
  'Option B English',
  'বিকল্প বি বাংলা',
  'Option C English',
  'বিকল্প সি বাংলা',
  'Option D English',
  'বিকল্প ডি বাংলা',
  'A',
  true
);
```

### Method 3: Bulk Import from CSV
You can use Supabase's CSV import feature:
1. Prepare a CSV file with columns matching the schema
2. Go to Supabase → Table Editor → questions
3. Click "Insert" → "Import data from CSV"
4. Upload your CSV file

## Adding Road Sign Questions with Images

### Step 1: Prepare Your Road Sign Image
- Recommended format: PNG or JPG
- Recommended size: 400x400px or similar square aspect ratio
- Clear, high-quality image of the road sign

### Step 2: Using Admin Panel
1. Go to Admin Panel → Questions → "+ Add Question"
2. Select "Road Sign" as question type
3. Click "Choose Image" button
4. Select your road sign image from your computer
5. Fill in the question and options
6. Click "Add Question"

The image will be automatically:
- Uploaded to Supabase Storage (`question-images` bucket)
- Given a unique filename
- Linked to the question via `image_url` field

### Step 3: Manual Image Upload (Alternative)
If you prefer to upload images manually:
1. Go to Supabase → Storage → question-images
2. Upload your image
3. Copy the public URL
4. Add the question via SQL with the `image_url` field:

```sql
INSERT INTO questions (
  question_text_en,
  question_text_bn,
  question_type,
  image_url,
  option_a_en,
  option_a_bn,
  -- ... other fields
) VALUES (
  'What does this road sign mean?',
  'এই রোড সাইনের অর্থ কি?',
  'road_sign',
  'https://your-supabase-url.supabase.co/storage/v1/object/public/question-images/your-image.png',
  -- ... other values
);
```

## Security Note

⚠️ **Important**: As requested, this table has **NO Row Level Security (RLS) policies** enabled. This means:
- Anyone can query the questions table
- Anyone can insert/update/delete questions
- Easy for quick database editing via Supabase Dashboard

If you need to add security later, you can enable RLS and add policies in Supabase → Authentication → Policies.

## Testing the System

### Test User Dashboard
1. Login as a regular user
2. Click "Question Bank" in sidebar
3. Try:
   - Searching for questions
   - Filtering by type
   - Selecting answers
   - Checking correct answers

### Test Admin Panel
1. Login as admin (email: `admin@brta.gov.bd`, password: `admin123`)
2. Click "Questions" in sidebar
3. Try:
   - Adding a new MCQ question
   - Adding a road sign question with image
   - Editing an existing question
   - Deleting a question
   - Toggling active/inactive status

## Troubleshooting

### Images Not Showing
- Ensure `question-images` bucket is set to **public**
- Check if the image URL in database is correct
- Verify image uploaded successfully to Supabase Storage

### Questions Not Appearing for Users
- Check if `is_active` is set to `true` in database
- Verify questions exist in database
- Check browser console for any errors

### Admin Cannot Add Questions
- Verify admin is logged in correctly
- Check Supabase permissions
- Look for errors in browser console

## File Structure

```
src/
├── components/
│   └── QuestionCard.jsx          # Reusable question display component
├── pages/
│   ├── QuestionBank.jsx          # User-facing question bank page
│   └── admin/
│       └── AdminQuestions.jsx    # Admin question management page
database/
├── questions_schema.sql          # Table creation script
└── questions_data.sql            # Initial data import script
```

## Next Steps

1. ✅ Run the SQL scripts to create table and import data
2. ✅ Create the Supabase Storage bucket for images
3. ✅ Test the Question Bank in User Dashboard
4. ✅ Test the Question Management in Admin Panel
5. ✅ Add more questions as needed
6. ✅ Upload road sign images

---

**Need Help?**
Check the browser console for errors or contact your development team.
