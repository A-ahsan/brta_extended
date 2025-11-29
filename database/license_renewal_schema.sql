-- License Renewal System
-- Complete schema for driving license renewal feature

-- 1. Add renewal-related columns to licenses table
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS renewal_count INTEGER DEFAULT 0;
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS last_renewed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS original_issue_date DATE;

-- Update existing licenses to set original_issue_date
UPDATE licenses SET original_issue_date = issue_date WHERE original_issue_date IS NULL;

-- 2. Create license_renewals table to track renewal history
CREATE TABLE IF NOT EXISTS license_renewals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id UUID REFERENCES licenses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Renewal Details
  renewal_number VARCHAR(30) UNIQUE NOT NULL,
  previous_expiry_date DATE NOT NULL,
  new_issue_date DATE NOT NULL,
  new_expiry_date DATE NOT NULL,
  
  -- Payment Information
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  amount NUMERIC(10,2) NOT NULL,
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')) NOT NULL,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_renewals_license_id ON license_renewals(license_id);
CREATE INDEX IF NOT EXISTS idx_renewals_user_id ON license_renewals(user_id);
CREATE INDEX IF NOT EXISTS idx_renewals_payment_id ON license_renewals(payment_id);
CREATE INDEX IF NOT EXISTS idx_renewals_status ON license_renewals(status);

-- 3. Function to generate renewal number
CREATE OR REPLACE FUNCTION generate_renewal_number()
RETURNS TEXT AS $$
DECLARE
  year_part TEXT;
  random_part TEXT;
BEGIN
  year_part := TO_CHAR(NOW(), 'YY');
  random_part := LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');
  RETURN 'RN' || year_part || random_part;
END;
$$ LANGUAGE plpgsql;

-- 4. Add renewal payment type to payments table
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_type VARCHAR(30) DEFAULT 'application' 
  CHECK (payment_type IN ('application', 'renewal', 'fine', 'other'));
ALTER TABLE payments ADD COLUMN IF NOT EXISTS license_id UUID REFERENCES licenses(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_payments_license_id ON payments(license_id);
CREATE INDEX IF NOT EXISTS idx_payments_type ON payments(payment_type);

-- 5. Function to check if license is expired or expiring soon
CREATE OR REPLACE FUNCTION check_license_expiry_status(p_license_id UUID)
RETURNS TABLE(
  is_expired BOOLEAN,
  days_until_expiry INTEGER,
  needs_renewal BOOLEAN
) AS $$
DECLARE
  v_expiry_date DATE;
  v_days INTEGER;
BEGIN
  SELECT expiry_date INTO v_expiry_date
  FROM licenses
  WHERE id = p_license_id;
  
  v_days := (v_expiry_date - CURRENT_DATE)::INTEGER;
  
  RETURN QUERY SELECT
    (CURRENT_DATE > v_expiry_date) AS is_expired,
    v_days AS days_until_expiry,
    (v_days <= 0 OR v_days <= 30) AS needs_renewal;
END;
$$ LANGUAGE plpgsql;

-- 6. Function to process license renewal
CREATE OR REPLACE FUNCTION process_license_renewal(
  p_license_id UUID,
  p_user_id UUID,
  p_payment_id UUID,
  p_amount NUMERIC
)
RETURNS JSON AS $$
DECLARE
  v_license RECORD;
  v_renewal_id UUID;
  v_renewal_number TEXT;
  v_new_issue_date DATE;
  v_new_expiry_date DATE;
  v_category VARCHAR(20);
  v_result JSON;
BEGIN
  -- Get license details
  SELECT * INTO v_license
  FROM licenses
  WHERE id = p_license_id AND user_id = p_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'License not found';
  END IF;
  
  -- Generate renewal number
  v_renewal_number := generate_renewal_number();
  
  -- Calculate new dates
  v_new_issue_date := CURRENT_DATE;
  v_category := v_license.license_category;
  
  -- Calculate expiry based on category
  IF v_category = 'Professional' THEN
    v_new_expiry_date := v_new_issue_date + INTERVAL '5 years';
  ELSE
    v_new_expiry_date := v_new_issue_date + INTERVAL '10 years';
  END IF;
  
  -- Create renewal record
  INSERT INTO license_renewals (
    license_id, user_id, renewal_number,
    previous_expiry_date, new_issue_date, new_expiry_date,
    payment_id, amount, status
  ) VALUES (
    p_license_id, p_user_id, v_renewal_number,
    v_license.expiry_date, v_new_issue_date, v_new_expiry_date,
    p_payment_id, p_amount, 'completed'
  )
  RETURNING id INTO v_renewal_id;
  
  -- Update license
  UPDATE licenses
  SET 
    issue_date = v_new_issue_date,
    expiry_date = v_new_expiry_date,
    expired = 0,
    status = 'active',
    renewal_count = renewal_count + 1,
    last_renewed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_license_id;
  
  -- Create notifications for user and admin
  PERFORM create_dual_notification(
    p_user_id,
    'License Renewed Successfully',
    'লাইসেন্স সফলভাবে নবায়ন হয়েছে',
    'Your driving license has been successfully renewed. New expiry date: ' || v_new_expiry_date::TEXT || '. Download your updated license from your profile.',
    'আপনার ড্রাইভিং লাইসেন্স সফলভাবে নবায়ন হয়েছে। নতুন মেয়াদ শেষের তারিখ: ' || v_new_expiry_date::TEXT || '। আপনার প্রোফাইল থেকে আপডেট করা লাইসেন্স ডাউনলোড করুন।',
    'payment',
    NULL,
    NULL,
    'License Renewal - ' || v_license.license_number,
    'লাইসেন্স নবায়ন - ' || v_license.license_number,
    'User ' || v_license.full_name_en || ' (License: ' || v_license.license_number || ') has renewed their license. New expiry: ' || v_new_expiry_date::TEXT || '. Amount: ৳' || p_amount::TEXT,
    'ব্যবহারকারী ' || v_license.full_name_bn || ' (লাইসেন্স: ' || v_license.license_number || ') তাদের লাইসেন্স নবায়ন করেছেন। নতুন মেয়াদ: ' || v_new_expiry_date::TEXT || '। পরিমাণ: ৳' || p_amount::TEXT
  );
  
  -- Return result
  v_result := json_build_object(
    'renewal_id', v_renewal_id,
    'renewal_number', v_renewal_number,
    'license_number', v_license.license_number,
    'new_issue_date', v_new_issue_date,
    'new_expiry_date', v_new_expiry_date,
    'amount', p_amount
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- 7. Function to create expiry notifications
CREATE OR REPLACE FUNCTION create_expiry_notifications()
RETURNS void AS $$
DECLARE
  v_license RECORD;
  v_days_until_expiry INTEGER;
BEGIN
  -- Notify for licenses expiring in 30 days or already expired
  FOR v_license IN 
    SELECT * FROM licenses 
    WHERE status = 'active' 
    AND (expiry_date - CURRENT_DATE) <= 30
    AND (expiry_date - CURRENT_DATE) >= -7 -- Don't notify for very old expired licenses
  LOOP
    v_days_until_expiry := (v_license.expiry_date - CURRENT_DATE)::INTEGER;
    
    -- Check if notification already exists for this license in the last 7 days
    IF NOT EXISTS (
      SELECT 1 FROM notifications
      WHERE user_id = v_license.user_id
      AND notification_type = 'renewal'
      AND created_at > NOW() - INTERVAL '7 days'
      AND message_en LIKE '%' || v_license.license_number || '%'
    ) THEN
      IF v_days_until_expiry <= 0 THEN
        -- License expired
        PERFORM create_dual_notification(
          v_license.user_id,
          'License Expired - Renewal Required',
          'লাইসেন্স মেয়াদোত্তীর্ণ - নবায়ন প্রয়োজন',
          'Your driving license (No. ' || v_license.license_number || ') has expired. Please renew it immediately to continue driving legally. Click on "Renew License" in your profile.',
          'আপনার ড্রাইভিং লাইসেন্স (নং ' || v_license.license_number || ') মেয়াদোত্তীর্ণ হয়েছে। আইনগতভাবে গাড়ি চালানো চালিয়ে যেতে দয়া করে অবিলম্বে এটি নবায়ন করুন। আপনার প্রোফাইলে "লাইসেন্স নবায়ন করুন" এ ক্লিক করুন।',
          'renewal',
          NULL,
          NULL,
          'License Expired - ' || v_license.license_number,
          'লাইসেন্স মেয়াদোত্তীর্ণ - ' || v_license.license_number,
          'License ' || v_license.license_number || ' (Holder: ' || v_license.full_name_en || ') has expired. Renewal required.',
          'লাইসেন্স ' || v_license.license_number || ' (ধারক: ' || v_license.full_name_bn || ') মেয়াদোত্তীর্ণ হয়েছে। নবায়ন প্রয়োজন।'
        );
      ELSIF v_days_until_expiry <= 30 THEN
        -- License expiring soon
        PERFORM create_dual_notification(
          v_license.user_id,
          'License Expiring Soon - Renewal Reminder',
          'লাইসেন্স শীঘ্রই মেয়াদোত্তীর্ণ - নবায়ন অনুস্মারক',
          'Your driving license (No. ' || v_license.license_number || ') will expire in ' || v_days_until_expiry || ' days (on ' || v_license.expiry_date::TEXT || '). Please renew it soon from your profile.',
          'আপনার ড্রাইভিং লাইসেন্স (নং ' || v_license.license_number || ') ' || v_days_until_expiry || ' দিনের মধ্যে মেয়াদোত্তীর্ণ হবে (' || v_license.expiry_date::TEXT || ' তারিখে)। দয়া করে শীঘ্রই আপনার প্রোফাইল থেকে এটি নবায়ন করুন।',
          'renewal',
          NULL,
          NULL,
          'License Expiring - ' || v_license.license_number,
          'লাইসেন্স মেয়াদোত্তীর্ণ হচ্ছে - ' || v_license.license_number,
          'License ' || v_license.license_number || ' (Holder: ' || v_license.full_name_en || ') will expire in ' || v_days_until_expiry || ' days.',
          'লাইসেন্স ' || v_license.license_number || ' (ধারক: ' || v_license.full_name_bn || ') ' || v_days_until_expiry || ' দিনের মধ্যে মেয়াদোত্তীর্ণ হবে।'
        );
      END IF;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 8. Add renewal notification type to notifications table
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_notification_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_notification_type_check 
  CHECK (notification_type IN ('application', 'verification', 'exam', 'payment', 'approval', 'rejection', 'general', 'renewal'));

-- 9. Get renewal fee based on license category
CREATE OR REPLACE FUNCTION get_renewal_fee(p_license_category VARCHAR)
RETURNS NUMERIC AS $$
BEGIN
  -- Professional: 2387 BDT (5 years), Non-Professional: 4212 BDT (10 years)
  IF p_license_category = 'Professional' THEN
    RETURN 2387.00;
  ELSE
    RETURN 4212.00;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Complete!
-- Run this script in your Supabase SQL editor to set up the renewal system
