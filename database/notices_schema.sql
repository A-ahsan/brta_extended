-- =============================================
-- BRTA Notices Management System
-- NO RLS (Row Level Security)
-- =============================================

-- Create notices table
CREATE TABLE IF NOT EXISTS public.notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title_en TEXT NOT NULL,
  title_bn TEXT NOT NULL,
  excerpt_en TEXT NOT NULL,
  excerpt_bn TEXT NOT NULL,
  content_en TEXT NOT NULL,
  content_bn TEXT NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('general', 'license', 'vehicle', 'tax', 'exam', 'maintenance')),
  badge VARCHAR(20), -- NEW, SCHEDULE, EXTENDED, UPDATE, NOTICE
  is_active BOOLEAN DEFAULT true,
  is_trending BOOLEAN DEFAULT false,
  show_in_ticker BOOLEAN DEFAULT true, -- Show in homepage ticker
  publish_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_notices_active ON public.notices(is_active);
CREATE INDEX IF NOT EXISTS idx_notices_category ON public.notices(category);
CREATE INDEX IF NOT EXISTS idx_notices_publish_date ON public.notices(publish_date DESC);
CREATE INDEX IF NOT EXISTS idx_notices_ticker ON public.notices(show_in_ticker) WHERE show_in_ticker = true;

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notices;

-- Grant permissions (NO RLS - public access)
GRANT ALL ON public.notices TO authenticated;
GRANT ALL ON public.notices TO anon;
GRANT ALL ON public.notices TO service_role;

-- Disable RLS completely
ALTER TABLE public.notices DISABLE ROW LEVEL SECURITY;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_notices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS set_notices_updated_at ON public.notices;
CREATE TRIGGER set_notices_updated_at
  BEFORE UPDATE ON public.notices
  FOR EACH ROW
  EXECUTE FUNCTION update_notices_updated_at();

-- Insert sample notices
INSERT INTO public.notices (
  title_en, 
  title_bn, 
  excerpt_en, 
  excerpt_bn, 
  content_en, 
  content_bn, 
  category, 
  badge,
  is_trending,
  show_in_ticker
) VALUES
(
  'New Online License Renewal System Launch',
  'নতুন অনলাইন লাইসেন্স নবায়ন সিস্টেম চালু',
  'BRTA introduces a fully digital license renewal system. No physical visit required.',
  'BRTA সম্পূর্ণ ডিজিটাল লাইসেন্স নবায়ন সিস্টেম চালু করেছে। কোন শারীরিক উপস্থিতির প্রয়োজন নেই।',
  'We are excited to announce the launch of our new online license renewal system. Citizens can now renew their driving licenses from the comfort of their homes. The system includes biometric verification, online payment, and instant processing. Valid from December 1, 2025.',
  'আমরা আমাদের নতুন অনলাইন লাইসেন্স নবায়ন সিস্টেম চালুর ঘোষণা দিতে পেরে আনন্দিত। নাগরিকরা এখন তাদের ঘর থেকে তাদের ড্রাইভিং লাইসেন্স নবায়ন করতে পারবেন। সিস্টেমে বায়োমেট্রিক যাচাইকরণ, অনলাইন পেমেন্ট এবং তাৎক্ষণিক প্রক্রিয়াকরণ অন্তর্ভুক্ত রয়েছে। ১ ডিসেম্বর, ২০২৫ থেকে কার্যকর।',
  'license',
  'NEW',
  false,
  true
),
(
  'Driving Test Schedule - December 2025',
  'ড্রাইভিং পরীক্ষার সময়সূচী - ডিসেম্বর ২০২৫',
  'Updated schedule for driving tests in all regional offices.',
  'সকল আঞ্চলিক অফিসে ড্রাইভিং পরীক্ষার আপডেট সময়সূচী।',
  'The driving test schedule for December 2025 has been published. Tests will be conducted from December 5-20 in all major cities. Slots are now available for booking through our online portal. Please bring your acknowledgment receipt and original documents.',
  'ডিসেম্বর ২০২৫ এর জন্য ড্রাইভিং পরীক্ষার সময়সূচী প্রকাশিত হয়েছে। সকল প্রধান শহরে ৫-২০ ডিসেম্বর পরীক্ষা অনুষ্ঠিত হবে। আমাদের অনলাইন পোর্টালের মাধ্যমে স্লট বুকিং এখন উপলব্ধ। অনুগ্রহ করে আপনার স্বীকৃতি রসিদ এবং মূল নথি আনুন।',
  'exam',
  'SCHEDULE',
  false,
  true
),
(
  'Tax Token Payment Deadline Extended',
  'ট্যাক্স টোকেন পেমেন্টের সময়সীমা বর্ধিত',
  'Annual tax token payment deadline extended to December 31, 2025.',
  'বার্ষিক ট্যাক্স টোকেন পেমেন্টের সময়সীমা ৩১ ডিসেম্বর, ২০২৫ পর্যন্ত বর্ধিত।',
  'In consideration of public convenience, the deadline for annual tax token payment has been extended to December 31, 2025. No late fees will be charged for payments made before this date. Pay online to avoid queues.',
  'জনসাধারণের সুবিধার কথা বিবেচনা করে, বার্ষিক ট্যাক্স টোকেন পেমেন্টের সময়সীমা ৩১ ডিসেম্বর, ২০২৫ পর্যন্ত বর্ধিত করা হয়েছে। এই তারিখের আগে করা পেমেন্টের জন্য কোন বিলম্ব ফি চার্জ করা হবে না। লাইন এড়াতে অনলাইনে পেমেন্ট করুন।',
  'tax',
  'EXTENDED',
  false,
  true
),
(
  'BRTA Go Mobile App Available - Download Now',
  'BRTA Go মোবাইল অ্যাপ উপলব্ধ - এখনই ডাউনলোড করুন',
  'Download the new BRTA Go app for seamless access to all services.',
  'সকল সেবায় নির্বিঘ্ন প্রবেশের জন্য নতুন BRTA Go অ্যাপ ডাউনলোড করুন।',
  'BRTA is proud to launch its official mobile application - BRTA Go. The app provides all services including license applications, vehicle registration, fee payment, and slot booking. Available on iOS and Android. Download now from your app store.',
  'BRTA তার অফিসিয়াল মোবাইল অ্যাপ্লিকেশন - BRTA Go চালু করতে পেরে গর্বিত। অ্যাপটি লাইসেন্স আবেদন, যানবাহন নিবন্ধন, ফি পেমেন্ট এবং স্লট বুকিং সহ সকল সেবা প্রদান করে। iOS এবং Android এ উপলব্ধ। আপনার অ্যাপ স্টোর থেকে এখনই ডাউনলোড করুন।',
  'general',
  'UPDATE',
  false,
  true
),
(
  '100% Digital Services Available 24/7 - No Middlemen',
  '১০০% ডিজিটাল সেবা ২৪/৭ উপলব্ধ - কোন মধ্যস্থতাকারী নেই',
  'All BRTA services are now 100% digital and available around the clock.',
  'সকল BRTA সেবা এখন ১০০% ডিজিটাল এবং সারাক্ষণ উপলব্ধ।',
  'BRTA has achieved 100% digitalization of all services. Citizens can now access all services 24/7 from anywhere. No need for middlemen or agents. Direct, transparent, and efficient service delivery guaranteed.',
  'BRTA সকল সেবার ১০০% ডিজিটালাইজেশন অর্জন করেছে। নাগরিকরা এখন যেকোনো স্থান থেকে ২৪/৭ সকল সেবা অ্যাক্সেস করতে পারবেন। মধ্যস্থতাকারী বা এজেন্টের কোন প্রয়োজন নেই। সরাসরি, স্বচ্ছ এবং দক্ষ সেবা প্রদান নিশ্চিত।',
  'general',
  'NOTICE',
  false,
  true
);

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Notices table created successfully with NO RLS!';
  RAISE NOTICE 'Sample notices inserted successfully!';
END $$;
