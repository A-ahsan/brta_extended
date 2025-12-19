// Supabase Edge Function for OTP Email Sending
// Deploy: supabase functions deploy send-otp
/// <reference types="https://deno.land/x/types/index.d.ts" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, language = 'en' } = await req.json()

    // Validate email
    if (!email || !email.includes('@')) {
      return new Response(
        JSON.stringify({ error: 'Invalid email address' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const expires = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Store OTP in database
    const { error: dbError } = await supabaseClient
      .from('password_reset_otps')
      .upsert({
        email: email.toLowerCase(),
        otp_code: otp,
        expires_at: expires.toISOString(),
        attempts: 0,
        created_at: new Date().toISOString()
      }, {
        onConflict: 'email'
      })

    if (dbError) {
      console.error('Database error:', dbError)
      return new Response(
        JSON.stringify({ error: 'Failed to store OTP' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Email templates
    const emailContent = language === 'bn' ? {
      subject: 'পাসওয়ার্ড রিসেট OTP - BRTA 2.0',
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
              <h1>🔐 পাসওয়ার্ড রিসেট OTP</h1>
              <p>BRTA 2.0 - স্মার্ট ট্রান্সপোর্ট পোর্টাল</p>
            </div>
            <div class="content">
              <h2>হ্যালো,</h2>
              <p>আপনার BRTA অ্যাকাউন্টের পাসওয়ার্ড রিসেট করার জন্য OTP কোড:</p>
              <div class="otp-box">
                <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">আপনার OTP কোড</p>
                <div class="otp-code">${otp}</div>
                <p style="margin: 10px 0 0 0; color: #6b7280; font-size: 12px;">এই কোডটি <strong>১০ মিনিটের</strong> জন্য বৈধ</p>
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
      subject: 'Password Reset OTP - BRTA 2.0',
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
              <h1>🔐 Password Reset OTP</h1>
              <p>BRTA 2.0 - Smart Transport Portal</p>
            </div>
            <div class="content">
              <h2>Hello,</h2>
              <p>Your OTP code to reset your BRTA account password:</p>
              <div class="otp-box">
                <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">Your OTP Code</p>
                <div class="otp-code">${otp}</div>
                <p style="margin: 10px 0 0 0; color: #6b7280; font-size: 12px;">This code is valid for <strong>10 minutes</strong></p>
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
    }

    // Send email using Resend API
    const resendApiKey = Deno.env.get('RESEND_API_KEY') ?? ''
    
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'BRTA 2.0 <onboarding@resend.dev>',
        to: email,
        subject: emailContent.subject,
        html: emailContent.html
      })
    })

    if (!emailResponse.ok) {
      const errorData = await emailResponse.json()
      console.error('Resend API error:', errorData)
      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: errorData }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Success response
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'OTP sent successfully',
        expiresIn: 600 // seconds
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
