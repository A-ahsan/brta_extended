import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

// ============================================
// DIRECT RESEND API INTEGRATION (NO EDGE FUNCTIONS!)
// Free tier: 100 emails/day to ANY email using onboarding@resend.dev
// ============================================

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

// ============================================
// GENERATE 6-DIGIT OTP
// ============================================
export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// ============================================
// HASH OTP (for secure storage)
// ============================================
const hashOTP = (otp) => {
  return crypto.createHash('sha256').update(otp).digest('hex');
};

// ============================================
// SEND OTP EMAIL VIA RESEND (DIRECT API CALL)
// ============================================
const sendOTPEmailViaResend = async (email, otp, language = 'en') => {
  const emailContent = language === 'bn' ? {
    subject: 'আপনার OTP কোড - BRTA 2.0',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px; }
          .otp-box { background: white; border: 3px dashed #059669; padding: 20px; margin: 25px 0; border-radius: 10px; text-align: center; }
          .otp-code { font-size: 42px; font-weight: bold; color: #059669; letter-spacing: 8px; font-family: monospace; }
          .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 আপনার OTP কোড</h1>
            <p>BRTA 2.0 - স্মার্ট ট্রান্সপোর্ট পোর্টাল</p>
          </div>
          <div class="content">
            <h2>হ্যালো,</h2>
            <p>আপনার BRTA অ্যাকাউন্ট যাচাইয়ের জন্য OTP কোড:</p>
            <div class="otp-box">
              <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">আপনার OTP কোড</p>
              <div class="otp-code">${otp}</div>
              <p style="margin: 10px 0 0 0; color: #6b7280; font-size: 12px;">এই কোডটি <strong>৫ মিনিটের</strong> জন্য বৈধ</p>
            </div>
            <div class="warning">
              <strong>⚠️ নিরাপত্তা সতর্কতা:</strong>
              <ul style="margin: 10px 0 0 0;">
                <li>এই OTP কোডটি কারো সাথে শেয়ার করবেন না</li>
                <li>BRTA কখনই ফোন বা ইমেইলে OTP চাইবে না</li>
                <li>যদি আপনি এই অনুরোধ না করে থাকেন, তাহলে এই ইমেইলটি উপেক্ষা করুন</li>
              </ul>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  } : {
    subject: 'Your OTP Code - BRTA 2.0',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px; }
          .otp-box { background: white; border: 3px dashed #059669; padding: 20px; margin: 25px 0; border-radius: 10px; text-align: center; }
          .otp-code { font-size: 42px; font-weight: bold; color: #059669; letter-spacing: 8px; font-family: monospace; }
          .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Your OTP Code</h1>
            <p>BRTA 2.0 - Smart Transport Portal</p>
          </div>
          <div class="content">
            <h2>Hello,</h2>
            <p>Your OTP code to verify your BRTA account:</p>
            <div class="otp-box">
              <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">Your OTP Code</p>
              <div class="otp-code">${otp}</div>
              <p style="margin: 10px 0 0 0; color: #6b7280; font-size: 12px;">This code is valid for <strong>5 minutes</strong></p>
            </div>
            <div class="warning">
              <strong>⚠️ Security Warning:</strong>
              <ul style="margin: 10px 0 0 0;">
                <li>Never share this OTP code with anyone</li>
                <li>BRTA will never ask for your OTP via phone or email</li>
                <li>If you didn't request this, please ignore this email</li>
              </ul>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'onboarding@resend.dev',
        to: [email],
        subject: emailContent.subject,
        html: emailContent.html
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Resend API Error:', data);
      throw new Error(data.message || 'Failed to send email');
    }

    return { success: true, messageId: data.id };
  } catch (error) {
    console.error('Email sending error:', error);
    throw error;
  }
};

// ============================================
// VERIFY OTP
// ============================================
export const verifyOTP = async (email, otp) => {
  try {
    const otpHash = hashOTP(otp);

    // 1. Get OTP from database
    const { data, error } = await supabase
      .from('password_reset_otps')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (error || !data) {
      return {
        valid: false,
        success: false,
        message: 'Invalid or expired OTP',
        error: 'OTP_NOT_FOUND'
      };
    }

    // 2. Check if expired
    const now = new Date();
    const expiresAt = new Date(data.expires_at);
    if (now > expiresAt) {
      // Delete expired OTP
      await supabase
        .from('password_reset_otps')
        .delete()
        .eq('email', email.toLowerCase());

      return {
        valid: false,
        success: false,
        message: 'OTP has expired',
        error: 'OTP_EXPIRED'
      };
    }

    // 3. Check attempts (max 3)
    if (data.attempts >= 3) {
      // Delete after max attempts
      await supabase
        .from('password_reset_otps')
        .delete()
        .eq('email', email.toLowerCase());

      return {
        valid: false,
        success: false,
        message: 'Maximum attempts exceeded',
        error: 'MAX_ATTEMPTS_EXCEEDED'
      };
    }

    // 4. Verify OTP
    if (data.otp_code !== otpHash) {
      // Increment attempts
      await supabase
        .from('password_reset_otps')
        .update({ attempts: data.attempts + 1 })
        .eq('email', email.toLowerCase());

      return {
        valid: false,
        success: false,
        message: 'Invalid OTP',
        error: 'INVALID_OTP',
        attemptsLeft: 3 - (data.attempts + 1)
      };
    }

    // 5. OTP is valid - DELETE IT from database (one-time use)
    await supabase.from('password_reset_otps').delete().eq('email', email.toLowerCase());
    
    return { valid: true, success: true, email, message: 'OTP verified successfully' };
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return { valid: false, success: false, message: 'Error verifying OTP' };
  }
};

// Delete OTP after use (now handled automatically in verifyOTP)
export const deleteOTP = async (email) => {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY
    );
    
    await supabase.from('password_reset_otps').delete().eq('email', email.toLowerCase());
    return { success: true };
  } catch (error) {
    console.error('Error deleting OTP:', error);
    return { success: false };
  }
};

// OTPs are now stored in database, cleanup handled by Supabase auto-delete
// No need for in-memory cleanup

// ============================================
// SEND OTP VIA SMS (Phone-based authentication)
// ============================================
export const sendOTPSMS = async (phoneNumber, language = 'en') => {
  try {
    // Import SMS service and normalize function
    const { sendOTPSMS: sendSMSOTP, normalizePhoneNumber } = await import('./smsService.js');
    
    // Normalize phone number (+880, 880, 0 handling)
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    console.log(`Sending SMS OTP to ${normalizedPhone} (original: ${phoneNumber})...`);

    // 1. Check rate limiting (max 3 OTPs per hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recentOTPs, error: rateLimitError } = await supabase
      .from('password_reset_otps')
      .select('id')
      .eq('email', normalizedPhone) // Using email column to store phone
      .gte('created_at', oneHourAgo);

    if (rateLimitError) {
      console.error('Rate limit check error:', rateLimitError);
    }

    if (recentOTPs && recentOTPs.length >= 3) {
      return {
        success: false,
        message: language === 'en' 
          ? 'Too many OTP requests. Please try again in an hour.'
          : 'অনেকবার OTP চাওয়া হয়েছে। এক ঘন্টা পর আবার চেষ্টা করুন।',
        error: 'RATE_LIMIT_EXCEEDED'
      };
    }

    // 2. Generate OTP
    const otp = generateOTP();
    const otpHash = hashOTP(otp);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // 3. Delete old OTPs for this phone
    await supabase
      .from('password_reset_otps')
      .delete()
      .eq('email', normalizedPhone); // Using email column to store phone

    // 4. Store OTP in database
    const { error: dbError } = await supabase
      .from('password_reset_otps')
      .insert({
        email: normalizedPhone, // Using email column to store phone number
        otp_code: otpHash,
        expires_at: expiresAt.toISOString(),
        attempts: 0,
        created_at: new Date().toISOString()
      });

    if (dbError) {
      console.error('Database error:', dbError);
      return { success: false, message: 'Failed to store OTP', error: dbError };
    }

    // 5. Send SMS
    const smsResult = await sendSMSOTP(normalizedPhone, otp, language);

    if (!smsResult.success) {
      console.error('SMS sending failed:', smsResult.message);
      return {
        success: false,
        message: language === 'en' 
          ? 'Failed to send SMS. Please try again.'
          : 'SMS পাঠাতে ব্যর্থ। আবার চেষ্টা করুন।',
        error: smsResult.message
      };
    }

    console.log(`SMS OTP sent successfully to ${normalizedPhone}`);
    return {
      success: true,
      message: language === 'en'
        ? 'OTP sent to your phone. Valid for 5 minutes.'
        : 'আপনার ফোনে OTP পাঠানো হয়েছে। ৫ মিনিটের জন্য বৈধ।',
      expiresIn: 300
    };

  } catch (error) {
    console.error('Error sending SMS OTP:', error);
    return {
      success: false,
      message: 'Failed to send OTP SMS',
      error: error.message
    };
  }
};

// ============================================
// VERIFY OTP BY PHONE
// ============================================
export const verifyOTPByPhone = async (phoneNumber, otp) => {
  try {
    // Import normalize function
    const { normalizePhoneNumber } = await import('./smsService.js');
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    
    const otpHash = hashOTP(otp);

    // Get OTP from database using phone number
    const { data, error } = await supabase
      .from('password_reset_otps')
      .select('*')
      .eq('email', normalizedPhone) // Using email column to store phone
      .single();

    if (error || !data) {
      return {
        valid: false,
        success: false,
        message: 'Invalid or expired OTP',
        error: 'OTP_NOT_FOUND'
      };
    }

    // Check if expired
    const now = new Date();
    const expiresAt = new Date(data.expires_at);
    if (now > expiresAt) {
      await supabase
        .from('password_reset_otps')
        .delete()
        .eq('email', normalizedPhone);

      return {
        valid: false,
        success: false,
        message: 'OTP has expired',
        error: 'OTP_EXPIRED'
      };
    }

    // Check attempts (max 3)
    if (data.attempts >= 3) {
      await supabase
        .from('password_reset_otps')
        .delete()
        .eq('email', normalizedPhone);

      return {
        valid: false,
        success: false,
        message: 'Maximum attempts exceeded',
        error: 'MAX_ATTEMPTS_EXCEEDED'
      };
    }

    // Verify OTP
    if (data.otp_code !== otpHash) {
      await supabase
        .from('password_reset_otps')
        .update({ attempts: data.attempts + 1 })
        .eq('email', normalizedPhone);

      return {
        valid: false,
        success: false,
        message: 'Invalid OTP',
        error: 'INVALID_OTP',
        attemptsLeft: 3 - (data.attempts + 1)
      };
    }

    // OTP is valid - delete it
    await supabase
      .from('password_reset_otps')
      .delete()
      .eq('email', normalizedPhone);
    
    return { 
      valid: true, 
      success: true, 
      phoneNumber: normalizedPhone, 
      message: 'OTP verified successfully' 
    };
  } catch (error) {
    console.error('Error verifying OTP by phone:', error);
    return { 
      valid: false, 
      success: false, 
      message: 'Error verifying OTP' 
    };
  }
};

// Send OTP email via Supabase Edge Function
// ============================================
// SEND OTP (Main Function)
// Purpose: signup, login, password-reset
// ============================================
export const sendOTPEmail = async (email, purpose = 'verification', language = 'en') => {
  try {
    console.log(`Sending OTP to ${email} for ${purpose}...`);

    // 1. Check rate limiting (max 3 OTPs per hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recentOTPs, error: rateLimitError } = await supabase
      .from('password_reset_otps')
      .select('id')
      .eq('email', email.toLowerCase())
      .gte('created_at', oneHourAgo);

    if (rateLimitError) {
      console.error('Rate limit check error:', rateLimitError);
    }

    if (recentOTPs && recentOTPs.length >= 3) {
      return {
        success: false,
        message: 'Too many OTP requests. Please try again in an hour.',
        error: 'RATE_LIMIT_EXCEEDED'
      };
    }

    // 2. Generate OTP
    const otp = generateOTP();
    const otpHash = hashOTP(otp);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // 3. Delete old OTPs for this email
    await supabase
      .from('password_reset_otps')
      .delete()
      .eq('email', email.toLowerCase());

    // 4. Store OTP in database
    const { error: dbError } = await supabase
      .from('password_reset_otps')
      .insert({
        email: email.toLowerCase(),
        otp_code: otpHash, // Store hashed OTP
        expires_at: expiresAt.toISOString(),
        attempts: 0,
        created_at: new Date().toISOString()
      });

    if (dbError) {
      console.error('Database error:', dbError);
      return { success: false, message: 'Failed to store OTP', error: dbError };
    }

    // 5. Send email via Resend (DIRECT API CALL)
    await sendOTPEmailViaResend(email, otp, language);

    console.log(`OTP sent successfully to ${email}`);
    return {
      success: true,
      message: 'OTP sent successfully',
      expiresIn: 300 // 5 minutes in seconds
    };

  } catch (error) {
    console.error('Error sending OTP:', error);
    return {
      success: false,
      message: 'Failed to send OTP email',
      error: error.message
    };
  }
};

// Send welcome email (optional)
export const sendWelcomeEmail = async (email, name, language = 'en') => {
  try {
    const transporter = createGmailTransporter();
    
    const emailContent = language === 'bn' ? {
      subject: 'BRTA 2.0 তে স্বাগতম!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 স্বাগতম ${name}!</h1>
              <p>BRTA 2.0 - স্মার্ট ট্রান্সপোর্ট পোর্টাল</p>
            </div>
            <div class="content">
              <h2>অভিনন্দন!</h2>
              <p>আপনার BRTA অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে।</p>
              <p>এখন আপনি সকল সেবা অ্যাক্সেস করতে পারবেন:</p>
              <ul>
                <li>✓ অনলাইন লাইসেন্স আবেদন</li>
                <li>✓ ভেহিকেল রেজিস্ট্রেশন</li>
                <li>✓ ট্যাক্স টোকেন রিনিউয়াল</li>
                <li>✓ আরো অনেক কিছু...</li>
              </ul>
            </div>
            <div class="footer">
              <p>© 2025 BRTA 2.0 - Bangladesh Road Transport Authority</p>
            </div>
          </div>
        </body>
        </html>
      `
    } : {
      subject: 'Welcome to BRTA 2.0!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Welcome ${name}!</h1>
              <p>BRTA 2.0 - Smart Transport Portal</p>
            </div>
            <div class="content">
              <h2>Congratulations!</h2>
              <p>Your BRTA account has been created successfully.</p>
              <p>You can now access all services:</p>
              <ul>
                <li>✓ Online License Applications</li>
                <li>✓ Vehicle Registration</li>
                <li>✓ Tax Token Renewal</li>
                <li>✓ And much more...</li>
              </ul>
            </div>
            <div class="footer">
              <p>© 2025 BRTA 2.0 - Bangladesh Road Transport Authority</p>
            </div>
          </div>
        </body>
        </html>
      `
    };
    
    const mailOptions = {
      from: `"BRTA 2.0" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: emailContent.subject,
      html: emailContent.html,
    };
    
    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return { success: false, error: error.message };
  }
};
