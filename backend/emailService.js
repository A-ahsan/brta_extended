import crypto from 'crypto';

// Resend API configuration (works with Render - no SMTP port blocking)
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = 'BRTA 2.0 <onboarding@resend.dev>'; // Use verified domain in production

// Fallback to Gmail SMTP for local development
import { createTransport } from 'nodemailer';
const createGmailTransporter = () => {
  return createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
};

// Send email via Resend API (works on Render - no SMTP blocking)
const sendViaResend = async (to, subject, html) => {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'BRTA 2.0 <onboarding@resend.dev>', // Use resend.dev domain or your verified domain
        to: [to],
        subject: subject,
        html: html,
      }),
    });

    const data = await response.json();
    
    if (response.ok) {
      return { success: true, messageId: data.id };
    } else {
      console.error('Resend API error:', data);
      return { success: false, error: data.message || 'Failed to send email' };
    }
  } catch (error) {
    console.error('Resend fetch error:', error);
    return { success: false, error: error.message };
  }
};

// Store for OTP codes (in production, use Redis or database)
const otpStore = new Map();

// Generate 6-digit OTP
export const generateOTP = (email) => {
  const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
  const expires = Date.now() + 600000; // 10 minutes from now
  
  otpStore.set(email.toLowerCase(), {
    otp,
    expires,
    attempts: 0,
  });
  
  return otp;
};

// Verify OTP
export const verifyOTP = (email, otp) => {
  const data = otpStore.get(email.toLowerCase());
  
  if (!data) {
    return { valid: false, message: 'No OTP found for this email' };
  }
  
  // Check if expired
  if (Date.now() > data.expires) {
    otpStore.delete(email.toLowerCase());
    return { valid: false, message: 'OTP has expired' };
  }
  
  // Check attempts (max 5 attempts)
  if (data.attempts >= 5) {
    otpStore.delete(email.toLowerCase());
    return { valid: false, message: 'Too many failed attempts. Please request a new OTP' };
  }
  
  // Verify OTP
  if (data.otp !== otp) {
    data.attempts++;
    return { valid: false, message: 'Invalid OTP', attemptsLeft: 5 - data.attempts };
  }
  
  return { valid: true, email };
};

// Delete OTP after use
export const deleteOTP = (email) => {
  otpStore.delete(email.toLowerCase());
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

// Send email via Resend API (HTTP-based, works on Render)
const sendViaResend = async (to, subject, html) => {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [to],
        subject: subject,
        html: html
      })
    });

    const data = await response.json();
    
    if (response.ok) {
      return { success: true, data };
    } else {
      return { success: false, error: data.message || 'Failed to send email' };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Send OTP email
export const sendOTPEmail = async (email, otp, language = 'en') => {
  try {
    // Try Resend first (works on Render), fallback to Gmail SMTP
    const useResend = process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.length > 0;
    
    // Email content based on language
    const emailContent = language === 'bn' ? {
      subject: 'পাসওয়ার্ড রিসেট OTP - BRTA 2.0',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px; }
            .otp-box { background: white; border: 3px dashed #059669; padding: 20px; margin: 25px 0; border-radius: 10px; text-align: center; }
            .otp-code { font-size: 42px; font-weight: bold; color: #059669; letter-spacing: 8px; font-family: 'Courier New', monospace; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
            .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 5px; }
            .timer { color: #dc2626; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 পাসওয়ার্ড রিসেট OTP</h1>
              <p>BRTA 2.0 - স্মার্ট ট্রান্সপোর্ট পোর্টাল</p>
            </div>
            <div class="content">
              <h2>হ্যালো,</h2>
              <p>আপনার BRTA অ্যাকাউন্টের পাসওয়ার্ড রিসেট করার জন্য OTP কোড:</p>
              
              <div class="otp-box">
                <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">আপনার OTP কোড</p>
                <div class="otp-code">${otp}</div>
                <p style="margin: 10px 0 0 0; color: #6b7280; font-size: 12px;">এই কোডটি <span class="timer">১০ মিনিটের</span> জন্য বৈধ</p>
              </div>
              
              <p>এই কোডটি পাসওয়ার্ড রিসেট পেজে লিখুন।</p>
              
              <div class="warning">
                <strong>⚠️ নিরাপত্তা সতর্কতা:</strong>
                <ul style="margin: 10px 0 0 0;">
                  <li>এই OTP কোডটি কারো সাথে শেয়ার করবেন না</li>
                  <li>BRTA কখনই ফোন বা ইমেইলে OTP চাইবে না</li>
                  <li>যদি আপনি এই অনুরোধ না করে থাকেন, তাহলে এই ইমেইলটি উপেক্ষা করুন</li>
                  <li>সর্বোচ্চ ৫টি ভুল প্রচেষ্টার পরে OTP বাতিল হবে</li>
                </ul>
              </div>
            </div>
            <div class="footer">
              <p>© 2025 BRTA 2.0 - Bangladesh Road Transport Authority</p>
              <p>এটি একটি স্বয়ংক্রিয় ইমেইল। অনুগ্রহ করে উত্তর দিবেন না।</p>
            </div>
          </div>
        </body>
        </html>
      `
    } : {
      subject: 'Password Reset OTP - BRTA 2.0',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px; }
            .otp-box { background: white; border: 3px dashed #059669; padding: 20px; margin: 25px 0; border-radius: 10px; text-align: center; }
            .otp-code { font-size: 42px; font-weight: bold; color: #059669; letter-spacing: 8px; font-family: 'Courier New', monospace; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
            .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 5px; }
            .timer { color: #dc2626; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Password Reset OTP</h1>
              <p>BRTA 2.0 - Smart Transport Portal</p>
            </div>
            <div class="content">
              <h2>Hello,</h2>
              <p>Your OTP code to reset your BRTA account password:</p>
              
              <div class="otp-box">
                <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">Your OTP Code</p>
                <div class="otp-code">${otp}</div>
                <p style="margin: 10px 0 0 0; color: #6b7280; font-size: 12px;">Valid for <span class="timer">10 minutes</span></p>
              </div>
              
              <p>Enter this code on the password reset page to continue.</p>
              
              <div class="warning">
                <strong>⚠️ Security Warning:</strong>
                <ul style="margin: 10px 0 0 0;">
                  <li>Never share this OTP code with anyone</li>
                  <li>BRTA will never ask for your OTP via phone or email</li>
                  <li>If you didn't request this, please ignore this email</li>
                  <li>OTP will be invalidated after 5 failed attempts</li>
                </ul>
              </div>
            </div>
            <div class="footer">
              <p>© 2025 BRTA 2.0 - Bangladesh Road Transport Authority</p>
              <p>This is an automated email. Please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };
    
    // Use Resend if API key is available, otherwise use Gmail SMTP
    if (useResend) {
      console.log('Sending OTP via Resend API...');
      const result = await sendViaResend(email, emailContent.subject, emailContent.html);
      if (result.success) {
        console.log('OTP sent successfully via Resend');
        return { success: true, message: 'OTP sent successfully' };
      } else {
        console.error('Resend failed, falling back to SMTP:', result.error);
        // Fallback to SMTP if Resend fails
      }
    }
    
    // Fallback to Gmail SMTP (will fail on Render but works locally)
    console.log('Sending OTP via Gmail SMTP...');
    const transporter = createGmailTransporter();
    const mailOptions = {
      from: `"BRTA 2.0" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: emailContent.subject,
      html: emailContent.html,
    };
    
    await transporter.sendMail(mailOptions);
    return { success: true, message: 'OTP sent successfully' };
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
