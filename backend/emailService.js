import crypto from 'crypto';

// Supabase Edge Function for OTP sending (FREE unlimited)
const SUPABASE_FUNCTION_URL = process.env.VITE_SUPABASE_FUNCTION_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

// Send OTP via Supabase Edge Function
const sendViaSupabaseFunction = async (email, language = 'en') => {
  try {
    const response = await fetch(SUPABASE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        email: email,
        language: language,
      }),
    });

    const data = await response.json();
    
    if (response.ok) {
      return { success: true, data };
    } else {
      console.error('Supabase Function error:', data);
      return { success: false, error: data.error || 'Failed to send OTP' };
    }
  } catch (error) {
    console.error('Supabase Function fetch error:', error);
    return { success: false, error: error.message };
  }
};

// Store for OTP codes (now handled by Supabase database)
const otpStore = new Map();

// Generate 6-digit OTP (still needed for backend, but Edge Function also generates)
export const generateOTP = (email) => {
  const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
  return otp;
  // Note: OTP is now stored in Supabase database by the Edge Function
};

// Verify OTP (now uses Supabase database)
export const verifyOTP = async (email, otp) => {
  try {
    // Import supabase client
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY
    );

    // Get OTP from database
    const { data, error } = await supabase
      .from('password_reset_otps')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (error || !data) {
      return { valid: false, message: 'No OTP found for this email' };
    }

    // Check if expired
    if (new Date() > new Date(data.expires_at)) {
      // Delete expired OTP
      await supabase.from('password_reset_otps').delete().eq('email', email.toLowerCase());
      return { valid: false, message: 'OTP has expired. Please request a new one.' };
    }

    // Check attempts (max 5 attempts)
    if (data.attempts >= 5) {
      // Delete after max attempts
      await supabase.from('password_reset_otps').delete().eq('email', email.toLowerCase());
      return { valid: false, message: 'Too many failed attempts. Please request a new OTP' };
    }

    // Verify OTP
    if (data.otp_code !== otp) {
      // Increment attempts
      await supabase
        .from('password_reset_otps')
        .update({ attempts: data.attempts + 1 })
        .eq('email', email.toLowerCase());
      
      return { 
        valid: false, 
        message: 'Invalid OTP', 
        attemptsLeft: 5 - (data.attempts + 1) 
      };
    }

    // OTP is valid - DELETE IT from database (one-time use)
    await supabase.from('password_reset_otps').delete().eq('email', email.toLowerCase());
    
    return { valid: true, email };
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return { valid: false, message: 'Error verifying OTP' };
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

// Clean up expired OTPs periodically
setInterval(() => {
  const now = Date.now();
  for (const [email, data] of otpStore.entries()) {
    if (now > data.expires) {
      otpStore.delete(email);
    }
  }
}, 300000); // Clean up every 5 minutes

// Send OTP email via Supabase Edge Function
export const sendOTPEmail = async (email, otp, language = 'en') => {
  try {
    console.log(`Sending OTP to ${email} via Supabase Edge Function...`);
    
    // Call Supabase Edge Function
    const result = await sendViaSupabaseFunction(email, language);
    
    if (result.success) {
      console.log('OTP sent successfully via Supabase');
      return { success: true, message: 'OTP sent successfully' };
    } else {
      console.error('Supabase Function failed:', result.error);
      return { success: false, message: 'Failed to send OTP email', error: result.error };
    }
  } catch (error) {
    console.error('Error sending OTP email:', error);
    return { success: false, message: 'Failed to send OTP email', error: error.message };
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
